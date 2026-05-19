import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

interface Props {
  clientSecret: string;
  publishableKey: string;
}

export function EmbeddedCheckoutView({ clientSecret, publishableKey }: Props) {
  const stripePromise = React.useMemo(() => loadStripe(publishableKey), [publishableKey]);

  return (
    <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
