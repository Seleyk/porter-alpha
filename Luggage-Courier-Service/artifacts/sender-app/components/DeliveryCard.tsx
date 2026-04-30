import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/context/ThemeContext";

type Delivery = {
  id: string;
  status: string;
  deliveryType?: string | null;
  packageSize: string;
  packageDescription: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedPrice: number;
  distanceKm?: number | null;
  courier?: { name: string; rating?: number | null } | null;
  sender?: { name: string } | null;
  createdAt: string;
};

type Props = {
  delivery: Delivery;
  role: "sender" | "courier";
  onPress?: () => void;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: "Pending", color: "#F59E0B", bg: "#FEF3C7", icon: "clock" },
  in_box: { label: "In Porter Box", color: "#7C3AED", bg: "#EDE9FE", icon: "inbox" },
  accepted: { label: "Accepted", color: "#3B82F6", bg: "#EFF6FF", icon: "user-check" },
  picked_up: { label: "Picked Up", color: "#8B5CF6", bg: "#EDE9FE", icon: "package" },
  delivered: { label: "Delivered", color: "#10B981", bg: "#D1FAE5", icon: "check-circle" },
  cancelled: { label: "Cancelled", color: "#EF4444", bg: "#FEE2E2", icon: "x-circle" },
};

const SIZE_ICONS: Record<string, string> = {
  small: "box",
  medium: "package",
  large: "archive",
  extra_large: "truck",
};

export function DeliveryCard({ delivery, role, onPress }: Props) {
  const C = useColors();
  const isBoxDropoff = delivery.deliveryType === "box_dropoff";
  const statusBase = STATUS_CONFIG[delivery.status] ?? STATUS_CONFIG.pending;
  const status = isBoxDropoff && delivery.status === "pending"
    ? { ...statusBase, label: "Awaiting Arrival" }
    : statusBase;
  const sizeIcon = SIZE_ICONS[delivery.packageSize] ?? "package";

  const handlePress = () => {
    Haptics.selectionAsync();
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: "/delivery/[id]",
        params: { id: delivery.id },
      });
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: C.surface, opacity: pressed ? 0.95 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
      ]}
      onPress={handlePress}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: C.primaryLight }]}>
          <Feather name={sizeIcon as any} size={20} color={C.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.description, { color: C.text }]} numberOfLines={1}>
            {delivery.packageDescription}
          </Text>
          <Text style={[styles.size, { color: C.textSecondary }]}>
            {delivery.packageSize.replace("_", " ")} package
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Feather name={status.icon as any} size={12} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.routeCol}>
          <View style={[styles.routeDot, { backgroundColor: C.primary }]} />
          <Text style={[styles.address, { color: C.text }]} numberOfLines={1}>
            {delivery.pickupAddress}
          </Text>
        </View>
        <View style={[styles.routeLine, { backgroundColor: C.border }]} />
        <View style={styles.routeCol}>
          <View style={[styles.routeDot, { backgroundColor: C.accent }]} />
          <Text style={[styles.address, { color: C.text }]} numberOfLines={1}>
            {delivery.dropoffAddress}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.price, { color: C.primary }]}>
          ${delivery.estimatedPrice.toFixed(2)}
        </Text>
        {delivery.distanceKm != null && (
          <Text style={[styles.distance, { color: C.textSecondary }]}>
            {(delivery.distanceKm * 0.621371).toFixed(1)} mi
          </Text>
        )}
        {role === "sender" && delivery.courier && (
          <View style={styles.courierRow}>
            <Feather name="truck" size={12} color={C.textSecondary} />
            <Text style={[styles.courierName, { color: C.textSecondary }]}>
              {delivery.courier.name}
            </Text>
          </View>
        )}
        <Feather name="chevron-right" size={16} color={C.textTertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: { flex: 1 },
  description: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  size: { fontSize: 12, fontFamily: "Inter_400Regular", textTransform: "capitalize" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  routeRow: { gap: 10 },
  routeCol: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: {
    height: 1,
    marginLeft: 18,
  },
  address: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  price: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1 },
  distance: { fontSize: 13, fontFamily: "Inter_400Regular" },
  courierRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  courierName: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
