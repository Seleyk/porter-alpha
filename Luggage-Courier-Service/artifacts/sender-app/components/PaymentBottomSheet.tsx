import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useUser } from "@/context/UserContext";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
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
  estimatedPrice,
  distanceKm,
  userId,
  deliveryData,
  confirmLabel = "Confirm Payment",
}: PaymentBottomSheetProps) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<"card" | null>(null);
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

  const { token } = useUser();

  async function openCheckout() {
    setLoadingType("card");
    setLoading(true);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await fetch(`https://${DOMAIN}/api/payments/checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ deliveryData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout");
      await Linking.openURL(data.url);
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Payment failed. Please try again.");
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

          <Pressable
            style={({ pressed }) => [
              styles.cardBtn,
              { opacity: pressed || loading ? 0.82 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
            onPress={() => openCheckout()}
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
