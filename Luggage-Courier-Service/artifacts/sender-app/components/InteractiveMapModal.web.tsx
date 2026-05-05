import type { MapPorterBox } from "./InteractiveMapModal";

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

export function InteractiveMapModal(_props: Props) {
  return null;
}
