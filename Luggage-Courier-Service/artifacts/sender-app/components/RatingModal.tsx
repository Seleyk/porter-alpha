import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColors } from "@/context/ThemeContext";

type Props = {
  visible: boolean;
  courierName: string;
  deliveryId: string;
  onClose: () => void;
};

export function RatingModal({ visible, courierName, deliveryId, onClose }: Props) {
  const C = useColors();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleStar = (star: number) => {
    Haptics.selectionAsync();
    setRating(star);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/deliveries/${deliveryId}/rate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
        }
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
      setTimeout(onClose, 1800);
    } catch {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          {submitted ? (
            <View style={styles.successWrap}>
              <View style={[styles.successIcon, { backgroundColor: C.successLight }]}>
                <Feather name="check" size={36} color={C.success} />
              </View>
              <Text style={[styles.successTitle, { color: C.text }]}>Thanks for rating!</Text>
              <Text style={[styles.successSub, { color: C.textSecondary }]}>
                Your feedback helps the community
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.handle} />
              <Text style={[styles.title, { color: C.text }]}>Rate Your Delivery</Text>
              <Text style={[styles.subtitle, { color: C.textSecondary }]}>
                How was your experience with your Porter?
              </Text>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => handleStar(star)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.9 : rating >= star ? 1.1 : 1 }] })}
                  >
                    <Feather
                      name={rating >= star ? "star" : "star"}
                      size={44}
                      color={rating >= star ? "#F59E0B" : C.border}
                    />
                  </Pressable>
                ))}
              </View>

              {rating > 0 && (
                <Text style={[styles.ratingLabel, { color: C.textSecondary }]}>
                  {["", "Poor", "Fair", "Good", "Great", "Excellent!"][rating]}
                </Text>
              )}

              <View style={[styles.commentWrap, { backgroundColor: C.background, borderColor: C.border }]}>
                <TextInput
                  style={[styles.comment, { color: C.text }]}
                  placeholder="Leave a comment (optional)"
                  placeholderTextColor={C.textTertiary}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  {
                    backgroundColor: rating > 0 ? C.primary : C.border,
                    opacity: pressed || loading ? 0.85 : 1,
                  },
                ]}
                onPress={handleSubmit}
                disabled={rating === 0 || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Submit Rating</Text>
                )}
              </Pressable>

              <Pressable onPress={onClose} style={styles.skipBtn}>
                <Text style={[styles.skipText, { color: C.textSecondary }]}>Skip for now</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 40,
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 4,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, marginTop: -8 },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  ratingLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    marginTop: -12,
  },
  commentWrap: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    minHeight: 90,
  },
  comment: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  submitBtn: {
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  skipBtn: { alignItems: "center", paddingVertical: 4 },
  skipText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  successWrap: { alignItems: "center", gap: 16, paddingVertical: 24 },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  successSub: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
