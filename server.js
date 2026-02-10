require("dotenv").config();
const express = require("express");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { createClient } = require("@supabase/supabase-js");

// --- Supabase client (backend, service role key) ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// --- STRIPE WEBHOOK (RAW BODY, MUST BE FIRST) ---
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const email = session.customer_details?.email;
      const paymentIntent = session.payment_intent;
      const priceId = session.line_items?.data?.[0]?.price?.id;

      if (email && paymentIntent) {
        const { error } = await supabase.from("purchases").insert([
          {
            email,
            stripe_payment_intent: paymentIntent,
            stripe_price_id: priceId
          }
        ]);

        if (error) {
          console.error("Supabase insert error:", error);
        } else {
          console.log("Purchase saved:", email);
        }
      }
    }

    res.json({ received: true });
  }
);

// --- JSON middleware AFTER webhook ---
app.use(express.json());
app.use(express.static("."));

// --- CREATE STRIPE CHECKOUT SESSION ---
app.post("/create-checkout-session", async (req, res) => {
  const { tariff } = req.body;

  const prices = {
    tariffA: "price_1SzFKjEcRNI4OiOt0YtUrR2J",
    tariffB: "price_1SzFKuEcRNI4OiOtxOfiTyCb"
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: prices[tariff], quantity: 1 }],
      success_url: `${process.env.BASE_URL}/thank-you.html`,
      cancel_url: `${process.env.BASE_URL}/`,
      customer_email: req.body.email || undefined
    });

    res.json({ id: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
