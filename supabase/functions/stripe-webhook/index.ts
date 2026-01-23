import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Helper to send SMS via Vonage
async function sendSMS(to: string, message: string): Promise<boolean> {
  const apiKey = Deno.env.get("VONAGE_API_KEY");
  const apiSecret = Deno.env.get("VONAGE_API_SECRET");
  const fromNumber = Deno.env.get("VONAGE_FROM_NUMBER");

  if (!apiKey || !apiSecret || !fromNumber) {
    logStep("SMS skipped - Vonage not configured");
    return false;
  }

  try {
    let formattedNumber = to.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    if (formattedNumber.startsWith("0")) {
      formattedNumber = "44" + formattedNumber.substring(1);
    } else if (formattedNumber.startsWith("+")) {
      formattedNumber = formattedNumber.substring(1);
    }

    const response = await fetch("https://rest.nexmo.com/sms/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        api_secret: apiSecret,
        from: fromNumber,
        to: formattedNumber,
        text: message,
      }),
    });

    const result = await response.json();
    logStep("SMS result", { to: formattedNumber, status: result.messages?.[0]?.status });
    return result.messages?.[0]?.status === "0";
  } catch (error) {
    logStep("SMS error", { error: error.message });
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2023-10-16',
  });

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!webhookSecret) {
    logStep('ERROR: STRIPE_WEBHOOK_SECRET not configured');
    return new Response(
      JSON.stringify({ error: 'Webhook secret not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      logStep('ERROR: No stripe-signature header');
      return new Response(
        JSON.stringify({ error: 'No signature provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logStep('ERROR: Webhook signature verification failed', { error: err.message });
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Webhook received', { type: event.type, id: event.id });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle relevant subscription events
    switch (event.type) {
      case 'customer.subscription.deleted': {
        // Subscription was canceled
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep('Subscription canceled', { customerId, subscriptionId: subscription.id });
        
        // Get customer email to find the caregiver
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) {
          logStep('Customer was deleted, skipping');
          break;
        }
        
        const email = (customer as Stripe.Customer).email;
        if (!email) {
          logStep('No email found for customer');
          break;
        }

        // Find caregiver by email
        const { data: caregiver, error: caregiverError } = await supabase
          .from('caregivers')
          .select('id, first_name, last_name')
          .eq('email', email)
          .maybeSingle();

        if (caregiverError || !caregiver) {
          logStep('Caregiver not found', { email, error: caregiverError?.message });
          break;
        }

        // Create admin notification about subscription cancellation
        const { error: notifError } = await supabase
          .from('admin_notifications')
          .insert({
            type: 'subscription_canceled',
            title: 'Subscription Canceled',
            message: `Subscription canceled for caregiver ${caregiver.first_name} ${caregiver.last_name} (${email})`,
          });

        if (notifError) {
          logStep('Error creating notification', { error: notifError.message });
        } else {
          logStep('Admin notification created for subscription cancellation');
        }
        break;
      }

      case 'customer.subscription.updated': {
        // Subscription was updated (could be status change)
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep('Subscription updated', { 
          customerId, 
          subscriptionId: subscription.id,
          status: subscription.status 
        });

        // Only notify on problematic statuses
        if (['past_due', 'unpaid', 'canceled'].includes(subscription.status)) {
          const customer = await stripe.customers.retrieve(customerId);
          if (customer.deleted) break;
          
          const email = (customer as Stripe.Customer).email;
          if (!email) break;

          const { data: caregiver } = await supabase
            .from('caregivers')
            .select('id, first_name, last_name')
            .eq('email', email)
            .maybeSingle();

          if (caregiver) {
            await supabase
              .from('admin_notifications')
              .insert({
                type: 'subscription_status_change',
                title: 'Subscription Status Changed',
                message: `Subscription status changed to ${subscription.status} for ${caregiver.first_name} ${caregiver.last_name} (${email})`,
              });
            logStep('Admin notification created for status change');
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Payment failed for an invoice
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        logStep('Invoice payment failed', { customerId, invoiceId: invoice.id });

        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) break;
        
        const email = (customer as Stripe.Customer).email;
        if (!email) break;

        const { data: caregiver } = await supabase
          .from('caregivers')
          .select('id, first_name, last_name')
          .eq('email', email)
          .maybeSingle();

        if (caregiver) {
          await supabase
            .from('admin_notifications')
            .insert({
              type: 'payment_failed',
              title: 'Payment Failed',
              message: `Payment failed for caregiver ${caregiver.first_name} ${caregiver.last_name} (${email}). Amount: £${(invoice.amount_due / 100).toFixed(2)}`,
            });
          logStep('Admin notification created for payment failure');
        }
        break;
      }

      case 'checkout.session.completed': {
        // Checkout completed - could be subscription or quote payment
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_email || (session.customer_details?.email);
        
        logStep('Checkout completed', { sessionId: session.id, email: customerEmail, mode: session.mode });

        // Check if this is a quote payment (has quote_id in metadata)
        const quoteId = session.metadata?.quote_id;
        if (quoteId) {
          logStep('Processing quote payment', { quoteId });
          
          // Get the quote with caregiver details
          const { data: quote, error: quoteFetchError } = await supabase
            .from('quotes')
            .select('*, caregivers!inner(id, first_name, last_name, email, phone)')
            .eq('id', quoteId)
            .single();

          if (quoteFetchError || !quote) {
            logStep('Error fetching quote', { error: quoteFetchError?.message });
            break;
          }

          // Update quote status to paid
          const { error: quoteUpdateError } = await supabase
            .from('quotes')
            .update({ 
              status: 'paid',
              payment_intent_id: session.payment_intent as string,
            })
            .eq('id', quoteId);

          if (quoteUpdateError) {
            logStep('Error updating quote status', { error: quoteUpdateError.message });
          } else {
            logStep('Quote marked as paid');
            
            // Create admin notification
            await supabase.from('admin_notifications').insert({
              type: 'quote_paid',
              title: 'Quote Payment Received',
              message: `Payment of £${(quote.total_amount / 100).toFixed(2)} received from ${customerEmail}`,
              match_id: session.metadata?.match_id,
              parent_email: customerEmail,
            });

            // Notify caregiver via email
            const caregiver = quote.caregivers;
            const resendApiKey = Deno.env.get("RESEND_API_KEY");
            
            if (resendApiKey && caregiver.email) {
              try {
                const resend = new Resend(resendApiKey);
                await resend.emails.send({
                  from: "Birth Rebel <noreply@notifications.birthrebel.com>",
                  to: [caregiver.email],
                  subject: "🎉 Payment Received - Your Quote Has Been Paid!",
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <h1 style="color: #7c3aed;">Payment Received!</h1>
                      <p>Hi ${caregiver.first_name},</p>
                      <p>Great news! Your quote has been paid.</p>
                      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Amount:</strong> £${(quote.total_amount / 100).toFixed(2)}</p>
                        <p style="margin: 10px 0 0 0;"><strong>From:</strong> ${customerEmail}</p>
                        <p style="margin: 10px 0 0 0;"><strong>Your payout:</strong> £${((quote.total_amount * 0.9) / 100).toFixed(2)}</p>
                      </div>
                      <p>The payment will be transferred to your connected Stripe account automatically.</p>
                      <p>You can log in to your Birth Rebel dashboard to see more details.</p>
                      <p style="margin-top: 30px;">Best wishes,<br>The Birth Rebel Team</p>
                    </div>
                  `,
                });
                logStep("Caregiver email sent", { to: caregiver.email });
              } catch (emailError) {
                logStep("Email error", { error: emailError.message });
              }
            }

            // Notify caregiver via SMS
            if (caregiver.phone) {
              await sendSMS(
                caregiver.phone,
                `Birth Rebel: Your quote of £${(quote.total_amount / 100).toFixed(2)} has been paid by ${customerEmail}! The funds will be transferred to your account. 🎉`
              );
            }
          }
        } else if (customerEmail && session.mode === 'subscription') {
          // Subscription checkout - trigger auto-booking
          try {
            const autoBookResponse = await fetch(
              `${supabaseUrl}/functions/v1/auto-book-matches`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({ caregiver_email: customerEmail }),
              }
            );
            
            const autoBookResult = await autoBookResponse.json();
            logStep('Auto-book result', autoBookResult);
          } catch (autoBookError) {
            logStep('Error calling auto-book-matches', { error: autoBookError.message });
          }
        }
        break;
      }

      default:
        logStep('Unhandled event type', { type: event.type });
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logStep('ERROR', { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});