import { Feather } from "@expo/vector-icons";
import { useUser } from "@/context/UserContext";

let useStripe: () => { initPaymentSheet: (...a: any[]) => Promise<any>; presentPaymentSheet: () => Promise<any> };
try {
  useStripe = require("@stripe/stripe-react-native").useStripe;
} catch {
  useStripe = () => ({
    initPaymentSheet: async () => ({ error: { message: "Stripe not available in Expo Go. Use a dev build." } }),
    presentPaymentSheet: async () => ({ error: { message: "Stripe not available in Expo Go. Use a dev build." } }),
  });
}
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;

export interface DeliveryData {
  packageSize: string;
  packageDescription: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  notes?: string;
  deliveryType?: "standard" | "porter_box";
  porterBoxId?: string;
  senderPhotoUrl?: string;
}

interface PaymentBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onCancelled?: (msg: string) => void;
  onSuccess?: (deliveryId: string) => void;
  estimatedPrice: number;
  distanceKm: number;
  userId: string;
  deliveryData: DeliveryData;
  confirmLabel?: string;
}

const SIZE_LABELS: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  extra_large: "Extra Large",
};

export function PaymentBottomSheet({
  visible,
  onClose,
  onCancelled,
  onSuccess,
  estimatedPrice,
  distanceKm,
  userId,
  deliveryData,
  confirmLabel = "Confirm Payment",
}: PaymentBottomSheetProps) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { token } = useUser();
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<"apple" | "card" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setError("");
      setLoading(false);
      setLoadingType(null);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 26,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 500,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const amountCents = Math.round(estimatedPrice * 100);

  async function handlePay(type: "apple" | "card") {
    setLoadingType(type);
    setLoading(true);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const intentRes = await fetch(`https://${DOMAIN}/api/payments/intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ deliveryData }),
      });
      const intentData = await intentRes.json();
      if (!intentRes.ok) throw new Error(intentData.error || "Could not create payment");

      const { clientSecret, paymentIntentId } = intentData as {
        clientSecret: string;
        paymentIntentId: string;
      };

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "SwiftSend",
        applePay: {
          merchantCountryCode: "US",
        },
        style: "alwaysLight",
      });

      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        setLoading(false);
        setLoadingType(null);
        if (presentError.code === "Canceled") {
          onCancelled?.("Payment was cancelled. You can try again when ready.");
          onClose();
        } else {
          setError(presentError.message);
        }
        return;
      }

      const completeRes = await fetch(`https://${DOMAIN}/api/payments/complete-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ paymentIntentId }),
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) throw new Error(completeData.error || "Could not confirm delivery");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
      if (onSuccess) {
        onSuccess(completeData.delivery.id);
      } else {
        router.replace({
          pathname: "/delivery/[id]",
          params: { id: completeData.delivery.id },
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Payment failed. Please try again.";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoading(false);
      setLoadingType(null);
    }
  }

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => { if (!loading) onClose(); }}
        />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.dragIndicator} />

          <Text style={styles.sheetTitle}>Confirm Payment</Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Package</Text>
              <Text style={styles.summaryValue}>
                {SIZE_LABELS[deliveryData.packageSize] ?? deliveryData.packageSize}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Distance</Text>
              <Text style={styles.summaryValue}>{(distanceKm * 0.621371).toFixed(1)} mi</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.totalValue}>${estimatedPrice.toFixed(2)}</Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {Platform.OS === "ios" && (
            <Pressable
              style={({ pressed }) => [styles.applePayRow, { opacity: pressed || loading ? 0.7 : 1 }]}
              onPress={() => handlePay("apple")}
              disabled={loading}
            >
              <View style={styles.applePayLeft}>
                {loadingType === "apple" ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <View style={styles.applePayBadge}>
                      <Text style={styles.applePayBadgeText}>Pay</Text>
                    </View>
                    <Text style={styles.applePayText}>Apple Pay</Text>
                  </>
                )}
              </View>
              {loadingType !== "apple" && (
                <Feather name="chevron-right" size={20} color="#555" />
              )}
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.cardBtn,
              { opacity: pressed || loading ? 0.82 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
            onPress={() => handlePay("card")}
            disabled={loading}
          >
            {loadingType === "card" ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.cardBtnText}>{confirmLabel}</Text>
            )}
          </Pressable>

          <View style={styles.secureRow}>
            <Feather name="lock" size={11} color="#8A96A3" />
            <Text style={styles.secureNote}>Secured by Stripe</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 44,
    paddingTop: 12,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DCE4EE",
    alignSelf: "center",
    marginBottom: 6,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#0E0F12",
    textAlign: "center",
    marginBottom: 2,
  },
  summaryCard: {
    backgroundColor: "#F5F8FC",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  summaryDivider: { height: 1, backgroundColor: "#DCE4EE" },
  summaryLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#8A96A3",
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#0E0F12",
  },
  totalValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#123E6B",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#DC2626",
  },
  applePayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#DCE4EE",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  applePayLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 28,
  },
  applePayBadge: {
    backgroundColor: "#000",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  applePayBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  applePayText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#0E0F12",
  },
  cardBtn: {
    borderWidth: 1.5,
    borderColor: "#DCE4EE",
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  cardBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#0E0F12",
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  secureNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#8A96A3",
  },
});
