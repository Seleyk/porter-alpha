import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColors } from "@/context/ThemeContext";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

type Suggestion = {
  id: string;
  place_name: string;
  center: [number, number];
};

type Props = {
  label: string;
  placeholder: string;
  value: string;
  dotColor: string;
  onSelect: (address: string, lat: number, lng: number) => void;
  autoFocus?: boolean;
  readOnly?: boolean;
};

export function AddressAutocomplete({ label, placeholder, value, dotColor, onSelect, autoFocus, readOnly }: Props) {
  const C = useColors();
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(!!value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value !== query) {
      setQuery(value);
      setSelected(!!value);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const search = useCallback(async (text: string) => {
    if (text.length < 3) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5&types=address,place,poi`
      );
      const data = await res.json();
      setSuggestions(data.features ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (text: string) => {
    setQuery(text);
    setSelected(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 350);
  };

  const handleSelect = (s: Suggestion) => {
    const [lng, lat] = s.center;
    setQuery(s.place_name);
    setSuggestions([]);
    setSelected(true);
    onSelect(s.place_name, lat, lng);
  };

  const showDropdown = focused && !selected && suggestions.length > 0;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: C.text }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: C.surface, borderColor: focused ? dotColor : C.border }]}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <TextInput
          style={[styles.input, { color: C.text }]}
          placeholder={placeholder}
          placeholderTextColor={C.textTertiary}
          value={query}
          onChangeText={readOnly ? undefined : handleChange}
          onFocus={() => { if (!readOnly) setFocused(true); }}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          autoCapitalize="words"
          returnKeyType="done"
          autoFocus={autoFocus}
          editable={!readOnly}
        />
        {loading && <ActivityIndicator size="small" color={dotColor} />}
        {selected && <Feather name="check-circle" size={18} color={C.success} />}
      </View>

      {showDropdown && (
        <View style={[styles.dropdown, { backgroundColor: C.surface, borderColor: C.border }]}>
          {suggestions.map((s, i) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [
                styles.suggestionItem,
                i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border },
                pressed && { backgroundColor: C.surfaceSecondary },
              ]}
              onPress={() => handleSelect(s)}
            >
              <Feather name="map-pin" size={14} color={dotColor} />
              <Text style={[styles.suggestionText, { color: C.text }]} numberOfLines={2}>
                {s.place_name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10, zIndex: 10, overflow: "visible" },
  label: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  dropdown: {
    position: "absolute",
    top: 90,
    left: 0,
    right: 0,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 100,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
  },
  suggestionText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
