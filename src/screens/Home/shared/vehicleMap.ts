import type MapView from "react-native-maps";
import type { LatLng, Region } from "react-native-maps";

// Bản đồ gốc của hệ điều hành (iOS: Apple Maps, Android: Google Maps) thay cho
// Leaflet + tile OpenStreetMap, vì tile OSM bị nhà mạng cố định VN chặn.

export const DEFAULT_REGION: Region = {
  latitude: 10.7769,
  longitude: 106.7009,
  latitudeDelta: 0.25,
  longitudeDelta: 0.25,
};

// Tương đương zoom 17 / 16 của Leaflet.
export const STREET_DELTA = 0.004;
export const NEIGHBORHOOD_DELTA = 0.008;

export const FIT_PADDING = { top: 60, right: 60, bottom: 60, left: 60 };

export const regionAround = (point: LatLng, delta = STREET_DELTA): Region => ({
  ...point,
  latitudeDelta: delta,
  longitudeDelta: delta,
});

export const toLatLng = (point: { lat: number; lng: number }): LatLng => ({
  latitude: point.lat,
  longitude: point.lng,
});

// Khoảng cách (mét) giữa 2 toạ độ — công thức haversine.
export const distanceInMeters = (a: LatLng, b: LatLng) => {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
};

export const fitMapTo = (map: MapView | null, points: LatLng[]) => {
  if (!map || !points.length) return;
  if (points.length === 1) {
    map.animateToRegion(regionAround(points[0]), 400);
  } else {
    map.fitToCoordinates(points, { edgePadding: FIT_PADDING, animated: true });
  }
};

// Zoom bằng cách thu/phóng khung region hiện tại — chạy giống nhau trên cả
// Apple Maps (không có "zoom level") và Google Maps.
export const zoomMap = (
  map: MapView | null,
  region: Region | null,
  factor: number
) => {
  if (!map || !region) return;
  const clamp = (value: number) => Math.min(Math.max(value * factor, 0.0005), 120);
  map.animateToRegion(
    {
      ...region,
      latitudeDelta: clamp(region.latitudeDelta),
      longitudeDelta: clamp(region.longitudeDelta),
    },
    250
  );
};

export const stopColor = (seconds?: number) =>
  (seconds ?? 0) > 1800 ? "#f44336" : (seconds ?? 0) > 600 ? "#ff9800" : "#4caf50";
