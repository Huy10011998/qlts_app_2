import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Orientation from "react-native-orientation-locker";
import MapView, { MapMarker, Region } from "react-native-maps";
import type { StackRoute } from "../../types";
import MapDotMarker from "./shared/MapDotMarker";
import VehicleMapControls from "./shared/VehicleMapControls";
import {
  DEFAULT_REGION,
  fitMapTo,
  regionAround,
  stopColor,
  toLatLng,
  zoomMap,
} from "./shared/vehicleMap";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";

export default function VehicleTrackingMapScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [mapLoading, setMapLoading] = useState(true);
  const route = useRoute<StackRoute<"VehicleTrackingMap">>();
  const { stopPoints, selectedId } = route.params;
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region | null>(null);
  const markerRefs = useRef<Record<number, MapMarker | null>>({});
  const didFocusSelectedRef = useRef(false);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const coordinates = useMemo(() => stopPoints.map(toLatLng), [stopPoints]);
  const selectedPoint = stopPoints.find((point) => point.id === selectedId);

  useEffect(() => {
    Orientation.unlockAllOrientations();
    return () => Orientation.lockToPortrait();
  }, []);

  // Lần đầu: có điểm được chọn thì zoom vào điểm đó và mở popup, không thì canh
  // tất cả điểm dừng. Xoay màn hình sau đó chỉ canh lại khi không chọn điểm nào.
  useEffect(() => {
    if (mapLoading) return;
    const timer = setTimeout(() => {
      if (selectedPoint) {
        if (didFocusSelectedRef.current) return;
        didFocusSelectedRef.current = true;
        mapRef.current?.animateToRegion(regionAround(toLatLng(selectedPoint)), 400);
        setTimeout(() => markerRefs.current[selectedPoint.id]?.showCallout(), 600);
      } else {
        fitMapTo(mapRef.current, coordinates);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [width, height, mapLoading, coordinates, selectedPoint]);

  const toggleOrientation = () => {
    if (isLandscape) {
      Orientation.lockToPortrait();
    } else {
      Orientation.lockToLandscape();
    }
  };

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        toolbarEnabled={false}
        onMapReady={() => setMapLoading(false)}
        onRegionChangeComplete={(region) => {
          regionRef.current = region;
        }}
      >
        {stopPoints.map((point) => (
          <MapDotMarker
            key={point.id}
            ref={(marker) => {
              markerRefs.current[point.id] = marker;
            }}
            coordinate={toLatLng(point)}
            color={stopColor(point.seconds)}
            title={`#${point.stt ?? ""} — ${point.time ?? ""}`}
            lines={[point.address, point.duration ? `Dừng: ${point.duration}` : null]}
          />
        ))}
      </MapView>
      {mapLoading ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={c.red} />
          <Text style={styles.loadingText}>Đang tải bản đồ dừng đỗ...</Text>
        </View>
      ) : (
        <>
          <VehicleMapControls
            onZoomIn={() => zoomMap(mapRef.current, regionRef.current, 0.5)}
            onZoomOut={() => zoomMap(mapRef.current, regionRef.current, 2)}
            onAction={() => fitMapTo(mapRef.current, coordinates)}
          />
          <TouchableOpacity
            style={styles.rotateButton}
            onPress={toggleOrientation}
          >
            <Ionicons
              name={
                isLandscape ? "phone-portrait-outline" : "phone-landscape-outline"
              }
              size={23}
              color={c.text}
            />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.border },
    map: { flex: 1, backgroundColor: c.border },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceAlt,
    },
    loadingText: { marginTop: 12, color: c.textSecondary, fontSize: 14 },
    rotateButton: {
      position: "absolute",
      top: 12,
      right: 12,
      width: 38,
      height: 38,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
      elevation: 4,
      shadowColor: c.shadow,
      shadowOpacity: 0.15,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
    },
  });
