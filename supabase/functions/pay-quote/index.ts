import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAY-QUOTE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { quote_id } = await req.json();
    if (!quote_id) {
      throw new Error("quote_id is required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the quote with caregiver's stripe account
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from("quotes")
      .select(`
        *,
        caregivers!inner(stripe_account_id, first_name, last_name)
      `)
      .eq("id", quote_id)
      .single();

    if (quoteError || !quote) {
      logStep("Quote not found", { error: quoteError });
      throw new Error("Quote not found");
    }

    if (quote.status !== "sent" && quote.status !== "accepted") {
      throw new Error(`Quote is ${quote.status}, cannot process payment`);
    }

    if (!quote.caregivers?.stripe_account_id) {
      throw new Error("Caregiver hasn't set up payment account");
    }

    logStep("Quote found", { 
      quoteId: quote.id, 
      total: quote.total_amount,
      caregiverAccount: quote.caregivers.stripe_account_id 
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Calculate platform fee (10%)
    const platformFee = Math.round(quote.total_amount * 0.10);

    // Build line items from quote items
    const lineItems = (quote.items as any[]).map((item: any) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.description,
        },
        unit_amount: item.unit_price,
      },
      quantity: item.quantity,
    }));

    const origin = req.headers.get("origin") || "https://birth-rebel-waitlist.lovable.app";

    // Create Checkout Session with Connect
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: quote.parent_email,
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: quote.caregivers.stripe_account_id,
        },
      },
      metadata: {
        quote_id: quote.id,
        match_id: quote.match_id,
        caregiver_id: quote.caregiver_id,
      },
      success_url: `${origin}/payment-success?quote_id=${quote.id}`,
      cancel_url: `${origin}/quote/${quote.id}?cancelled=true`,
    });

    logStep("Checkout session created", { sessionId: session.id });

    // Store payment intent ID but keep status as "sent" until payment is confirmed via webhook
    await supabaseAdmin
      .from("quotes")
      .update({ 
        payment_intent_id: session.payment_intent as string,
      })
      .eq("id", quote.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
