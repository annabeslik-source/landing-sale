const stripe = Stripe("pk_test_51KKrVmEcRNI4OiOtoQcytzAhvE5D6AQt6HkV0B7lah4INdCkMuU5QiM7TO0NWvqOldJ0ARRnh3lBlRROg6FinKVg00Zf1qSlUA"); // Replace with your Stripe public key

async function buy(tariff) {
  try {
    const response = await fetch("/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tariff })
    });
    const session = await response.json();

    const result = await stripe.redirectToCheckout({ sessionId: session.id });
    if (result.error) {
      alert(result.error.message);
    }
  } catch (err) {
    console.error(err);
    alert("Something went wrong. Please try again.");
  }
}
