import React from "react";

export interface StripeReadyState {
  stripeReady: boolean;
  stripeError: string | null;
}

export const StripeReadyContext = React.createContext<StripeReadyState>({
  stripeReady: true,
  stripeError: null,
});

export function useStripeReady(): StripeReadyState {
  return React.useContext(StripeReadyContext);
}
