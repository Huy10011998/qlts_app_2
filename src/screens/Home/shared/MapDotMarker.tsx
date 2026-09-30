import React, { forwardRef, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Callout, LatLng, MapMarker, Marker } from "react-native-maps";

type Props = {
  coordinate: LatLng;
  color: string;
  size?: number;
  title?: string;
  lines?: Array<string | null | undefined>;
  onPress?: () => void;
};

// Chấm tròn màu (giống divIcon cũ bên Leaflet) kèm popup tiêu đề + các dòng mô tả.
const MapDotMarker = forwardRef<MapMarker, Props>(function MapDotMarker(
  { coordinate, color, size = 16, title, lines = [], onPress },
  ref
) {
  // Android chụp view marker thành bitmap: cần tracksViewChanges lúc đầu để kịp
  // vẽ, sau đó tắt đi cho nhẹ (nhất là màn có nhiều điểm dừng).
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(timer);
  }, [color, size]);

  const visibleLines = lines.filter((line): line is string => Boolean(line));

  return (
    <Marker
      ref={ref}
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      onPress={onPress}
    >
      <View
        style={[
          styles.dot,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        ]}
      />
      {title || visibleLines.length ? (
        <Callout>
          <View style={styles.callout}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {visibleLines.map((line, index) => (
              <Text
                key={index}
                style={index === visibleLines.length - 1 && index > 0 ? styles.muted : styles.line}
              >
                {line}
              </Text>
            ))}
          </View>
        </Callout>
      ) : null}
    </Marker>
  );
});

export default MapDotMarker;

const styles = StyleSheet.create({
  dot: {
    borderWidth: 2.5,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  callout: { width: 220, paddingVertical: 2 },
  title: { color: "#1976d2", fontSize: 13, fontWeight: "700", marginBottom: 2 },
  line: { color: "#222222", fontSize: 12, lineHeight: 17 },
  muted: { color: "#777777", fontSize: 12, lineHeight: 17 },
});
