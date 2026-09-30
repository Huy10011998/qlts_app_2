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
import MapView, { Polyline, Region } from "react-native-maps";
import type { StackRoute } from "../../types";
import MapDotMarker from "./shared/MapDotMarker";
import VehicleMapControls from "./shared/VehicleMapControls";
import {
  DEFAULT_REGION,
  fitMapTo,
  toLatLng,
  zoomMap,
} from "./shared/vehicleMap";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";

export default function VehicleJourneyMapScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [mapLoading, setMapLoading] = useState(true);
  const route = useRoute<StackRoute<"VehicleJourneyMap">>();
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region | null>(null);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const points = useMemo(
    () => route.params.coordinates.map(toLatLng),
    [route.params.coordinates]
  );

  useEffect(() => {
    Orientation.unlockAllOrientations();
    return () => Orientation.lockToPortrait();
  }, []);

  // Xoay màn hình thì khung bản đồ đổi kích thước: canh lại toàn tuyến.
  useEffect(() => {
    if (mapLoading) return;
    const timer = setTimeout(() => fitMapTo(mapRef.current, points), 250);
    return () => clearTimeout(timer);
  }, [width, height, mapLoading, points]);

  const toggleOrientation = () => {
    if (isLandscape) {
      Orientation.lockToPortrait();
    } else {
      Orientation.lockToLandscape();
    }
  };

  const start = points[0];
  const end = points[points.length - 1];

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
        {points.length > 1 ? (
          <Polyline
            coordinates={points}
            strokeColor="#1976d2"
            strokeWidth={5}
            lineJoin="round"
            lineCap="round"
          />
        ) : null}
        {start && points.length > 1 ? (
          <MapDotMarker coordinate={start} color="#4caf50" size={18} title="Xuất phát" />
        ) : null}
        {end ? (
          <MapDotMarker coordinate={end} color="#f44336" size={18} title="Kết thúc" />
        ) : null}
      </MapView>
      {mapLoading ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={c.red} />
          <Text style={styles.loadingText}>Đang tải bản đồ hành trình...</Text>
        </View>
      ) : (
        <>
          <VehicleMapControls
            onZoomIn={() => zoomMap(mapRef.current, regionRef.current, 0.5)}
            onZoomOut={() => zoomMap(mapRef.current, regionRef.current, 2)}
            onAction={() => fitMapTo(mapRef.current, points)}
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
      shadowColor: c.shadow,
      shadowOpacity: 0.15,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
  });
