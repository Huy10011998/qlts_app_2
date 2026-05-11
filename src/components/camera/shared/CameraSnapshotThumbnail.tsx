import React from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
} from "react-native";
import { getCameraSnapshotUrl } from "./cameraStreamUtils";

type CameraSnapshotThumbnailProps = {
  cameraCode: string;
  cameraId: string | number;
  cameraToken: string;
  focusKey: number;
  thumbTimestamp: number;
};

export default React.memo(function CameraSnapshotThumbnail({
  cameraCode,
  cameraId,
  cameraToken,
  focusKey,
  thumbTimestamp,
}: CameraSnapshotThumbnailProps) {
  const [retryCount, setRetryCount] = React.useState(0);
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    setRetryCount(0);
    setIsLoaded(false);
  }, [cameraId, cameraToken, thumbTimestamp, focusKey]);

  const frameUrl = getCameraSnapshotUrl(
    cameraCode,
    thumbTimestamp,
    `&rk=${focusKey}&rt=${retryCount}`,
  );

  return (
    <View style={styles.preview}>
      {!isLoaded && (
        <View style={styles.previewLoading}>
          <ActivityIndicator size="small" color="#555" />
        </View>
      )}
      <Image
        key={`thumb-${cameraId}-${focusKey}-${retryCount}`}
        source={{
          uri: frameUrl,
          headers: { Authorization: `Bearer ${cameraToken}` },
        }}
        style={styles.preview}
        resizeMode="cover"
        onLoadStart={() => setIsLoaded(false)}
        onLoadEnd={() => setIsLoaded(true)}
        onError={() => {
          setIsLoaded(false);
          if (retryCount >= 3) return;
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
          }, 500 * (retryCount + 1));
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  preview: {
    flex: 1,
    backgroundColor: "#111",
  },
  previewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
});
