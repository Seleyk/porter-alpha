import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/context/ThemeContext";

export type MapPorterBox = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm?: number | null;
};

function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const coords: { latitude: number; longitude: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push({ latitude: lat * 1e-5, longitude: lng * 1e-5 });
  }
  return coords;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  routePolyline?: string | null;
  routeColor?: string;
  porterBoxes?: MapPorterBox[];
  selectedPorterBoxId?: string | null;
  onSelectPorterBox?: (box: MapPorterBox) => void;
};

export function InteractiveMapModal({
  visible,
  onClose,
  title,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  routePolyline,
  routeColor = "#123E6B",
  porterBoxes,
  selectedPorterBoxId,
  onSelectPorterBox,
}: Props) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const [MapView, setMapView] = useState<any>(null);
  const [Marker, setMarker] = useState<any>(null);
  const [Polyline, setPolyline] = useState<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tappedBox, setTappedBox] = useState<MapPorterBox | null>(null);

  useEffect(() => {
    if (!visible || Platform.OS === "web") return;
    import("react-native-maps")
      .then((mod) => {
        setMapView(() => mod.default);
        setMarker(() => mod.Marker);
        setPolyline(() => mod.Polyline);
        setMapReady(true);
      })
      .catch(() => setMapReady(false));
  }, [visible]);

  useEffect(() => {
    if (!visible) setTappedBox(null);
  }, [visible]);

  const region = useMemo(() => {
    const pts: { lat: number; lng: number }[] = [];
    if (pickupLat != null && pickupLng != null) pts.push({ lat: pickupLat, lng: pickupLng });
    if (dropoffLat != null && dropoffLng != null) pts.push({ lat: dropoffLat, lng: dropoffLng });
    if (porterBoxes?.length) porterBoxes.forEach((b) => pts.push({ lat: b.lat, lng: b.lng }));
    if (!pts.length) return null;
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(Math.abs(maxLat - minLat) * 1.6, 0.012),
      longitudeDelta: Math.max(Math.abs(maxLng - minLng) * 1.6, 0.012),
    };
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, porterBoxes]);

  const routeCoords = useMemo(
    () => (routePolyline ? decodePolyline(routePolyline) : []),
    [routePolyline]
  );

  const hasBoxes = (porterBoxes?.length ?? 0) > 0;
  const isBoxMode = hasBoxes && !!onSelectPorterBox;

  if (Platform.OS === "web") return null;

  const handleSelectAndClose = (box: MapPorterBox) => {
    onSelectPorterBox!(box);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.background }]}>
        <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [s.headerBtn, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Feather name="x" size={22} color={C.text} />
          </Pressable>
          <Text style={[s.headerTitle, { color: C.text }]} numberOfLines={1}>
            {title ?? "Map"}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={{ flex: 1 }}>
          {mapReady && MapView && region ? (
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={region}
              mapType="standard"
              showsUserLocation={false}
              showsPointsOfInterest
              showsCompass
              zoomEnabled
              scrollEnabled
              rotateEnabled
              pitchEnabled
            >
              {routeCoords.length > 1 && Polyline && (
                <Polyline
                  coordinates={routeCoords}
                  strokeColor={hasBoxes ? "#7C3AED" : routeColor}
                  strokeWidth={4}
                  lineJoin="round"
                />
              )}
              {pickupLat != null && pickupLng != null && Marker && (
                <Marker
                  coordinate={{ latitude: pickupLat, longitude: pickupLng }}
                  title="Pickup"
                  description="Pickup location"
                  pinColor="#123E6B"
                />
              )}
              {dropoffLat != null && dropoffLng != null && !hasBoxes && Marker && (
                <Marker
                  coordinate={{ latitude: dropoffLat, longitude: dropoffLng }}
                  title="Drop-off"
                  description="Drop-off location"
                  pinColor="#EF4444"
                />
              )}
              {hasBoxes &&
                Marker &&
                porterBoxes!.map((box, idx) => {
                  const isSelected = box.id === selectedPorterBoxId;
                  const isTapped = box.id === tappedBox?.id;
                  return (
                    <Marker
                      key={box.id}
                      coordinate={{ latitude: box.lat, longitude: box.lng }}
                      title={box.name}
                      description={box.address}
                      onPress={() => setTappedBox(box)}
                    >
                      <View
                        style={[
                          s.pin,
                          {
                            backgroundColor:
                              isSelected || isTapped ? "#7C3AED" : "#A78BFA",
                            borderColor: isSelected ? "#5B21B6" : "#7C3AED",
                            transform: [{ scale: isSelected || isTapped ? 1.15 : 1 }],
                          },
                        ]}
                      >
                        <Text style={s.pinNum}>{idx + 1}</Text>
                      </View>
                    </Marker>
                  );
                })}
            </MapView>
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { alignItems: "center", justifyContent: "center", backgroundColor: C.surfaceSecondary },
              ]}
            >
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={[s.loadingText, { color: C.textSecondary }]}>Loading map…</Text>
            </View>
          )}
        </View>

        {isBoxMode && tappedBox && (
          <View
            style={[
              s.chipSheet,
              { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: insets.bottom + 12 },
            ]}
          >
            <View style={s.chipRow}>
              <View style={[s.chipIcon, { backgroundColor: "#F5F0FF" }]}>
                <Feather name="package" size={20} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.chipName, { color: C.text }]} numberOfLines={1}>
                  {tappedBox.name}
                </Text>
                <Text style={[s.chipAddr, { color: C.textSecondary }]} numberOfLines={1}>
                  {tappedBox.address}
                </Text>
              </View>
              <Pressable
                onPress={() => handleSelectAndClose(tappedBox)}
                style={({ pressed }) => [s.chipBtn, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={s.chipBtnText}>Select</Text>
              </Pressable>
            </View>
          </View>
        )}

        {!isBoxMode && (
          <View
            style={[
              s.closeBar,
              { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: insets.bottom + 8 },
            ]}
          >
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                s.closeBarBtn,
                { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={s.closeBarText}>Done</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pinNum: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  chipSheet: {
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chipIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chipName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  chipAddr: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  chipBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: "#7C3AED",
  },
  chipBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  closeBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  closeBarBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  closeBarText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
