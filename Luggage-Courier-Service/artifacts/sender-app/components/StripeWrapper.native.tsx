import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StripeReadyContext } from "./StripeReadyContext";

let StripeProvider: React.ComponentType<{ publishableKey: string; merchantIdentifier?: string; children: React.ReactNode }> | null = null;
try {
  StripeProvider = require("@stripe/stripe-react-native").StripeProvider;
} catch {
  StripeProvider = null;
}

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;

export function StripeWrapper({ children }: { children: React.ReactNode }) {
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    fetch(`https://${DOMAIN}/api/payments/config`)
      .then((r) => r.json())
      .then((d) => {
        if (d.publishableKey) {
          setPublishableKey(d.publishableKey);
        } else {
          setFetchFailed(true);
        }
      })
      .catch(() => setFetchFailed(true));
  }, []);

  if (publishableKey === null && !fetchFailed) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#123E6B" />
      </View>
    );
  }

  if (fetchFailed || !publishableKey) {
    return (
      <StripeReadyContext.Provider value={{ stripeReady: false, stripeError: "Payment service unavailable. Please try again later." }}>
        {children}
      </StripeReadyContext.Provider>
    );
  }

  if (!StripeProvider) {
    return (
      <StripeReadyContext.Provider value={{ stripeReady: false, stripeError: "Native Stripe module unavailable. Please use a dev build instead of Expo Go." }}>
        {children}
      </StripeReadyContext.Provider>
    );
  }

  return (
    <StripeReadyContext.Provider value={{ stripeReady: true, stripeError: null }}>
      <StripeProvider publishableKey={publishableKey} merchantIdentifier="merchant.swiftsend.app">
        {children}
      </StripeProvider>
    </StripeReadyContext.Provider>
  );
}
