import React from "react";

interface Props {
  clientSecret: string;
  publishableKey: string;
}

// Native stub — embedded checkout is web-only; native uses Linking.openURL
export function EmbeddedCheckoutView(_props: Props) {
  return null;
}
