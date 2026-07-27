import { C } from "../../../utils/helpers/colors";
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
  showLoadingIndicator?: boolean;
  thumbTimestamp: number;
};

/** Ghi nhớ ảnh đã tải giữa các instance timeline/grid dùng chung một URL. */
const loadedFrameUrls = new Set<string>();

export default React.memo(function CameraSnapshotThumbnail({
  cameraCode,
  cameraId,
  cameraToken,
  focusKey,
  showLoadingIndicator = true,
  thumbTimestamp,
}: CameraSnapshotThumbnailProps) {
  const [retryCount, setRetryCount] = React.useState(0);
  const baseFrameUrl = getCameraSnapshotUrl(
    cameraCode,
    thumbTimestamp,
    `&rk=${focusKey}`,
  );
  const [isLoaded, setIsLoaded] = React.useState(() =>
    loadedFrameUrls.has(baseFrameUrl),
  );

  React.useEffect(() => {
    setRetryCount(0);
    setIsLoaded(loadedFrameUrls.has(baseFrameUrl));
  }, [baseFrameUrl, cameraId, cameraToken]);

  const frameUrl = getCameraSnapshotUrl(
    cameraCode,
    thumbTimestamp,
    `&rk=${focusKey}&rt=${retryCount}`,
  );

  return (
    <View style={styles.preview}>
      {showLoadingIndicator && !isLoaded && (
        <View style={styles.previewLoading}>
          <ActivityIndicator size="small" color={C.red} />
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
        onLoadStart={() => {
          if (!loadedFrameUrls.has(baseFrameUrl)) setIsLoaded(false);
        }}
        onLoadEnd={() => {
          loadedFrameUrls.add(baseFrameUrl);
          setIsLoaded(true);
        }}
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
