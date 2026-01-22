import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

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
            message: `Subscription canceled for caregiver ${caregiver.first_name} ${caregiver.last_name} (${email})`,
            metadata: {
              caregiver_id: caregiver.id,
              caregiver_email: email,
              subscription_id: subscription.id,
            },
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
                message: `Subscription status changed to ${subscription.status} for ${caregiver.first_name} ${caregiver.last_name} (${email})`,
                metadata: {
                  caregiver_id: caregiver.id,
                  caregiver_email: email,
                  subscription_id: subscription.id,
                  new_status: subscription.status,
                },
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
              message: `Payment failed for caregiver ${caregiver.first_name} ${caregiver.last_name} (${email}). Amount: $${(invoice.amount_due / 100).toFixed(2)}`,
              metadata: {
                caregiver_id: caregiver.id,
                caregiver_email: email,
                invoice_id: invoice.id,
                amount_due: invoice.amount_due,
              },
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
              message: `Payment received for quote ${quoteId} from ${customerEmail}`,
              match_id: session.metadata?.match_id,
              parent_email: customerEmail,
            });
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
