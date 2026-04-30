import React from "react";
import { StripeReadyContext } from "./StripeReadyContext";

export function StripeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <StripeReadyContext.Provider value={{ stripeReady: true, stripeError: null }}>
      {children}
    </StripeReadyContext.Provider>
  );
}
