import React, { useEffect, useState } from "react";
import { StyleSheet, Dimensions, View, Animated } from "react-native";
import { WebView } from "react-native-webview";
import { CenterTextProps } from "../../types";
import IsLoading from "../ui/IconLoading";
import { C } from "../../utils/helpers/colors";
import AssetListEmptyState from "./shared/AssetListEmptyState";

export default function AssetNoteDetails({ text }: CenterTextProps) {
  const safeText =
    typeof text === "string" && text.trim().length > 0 ? text : "---";
  const shouldShowLoader = safeText !== "---";
  const [loading, setLoading] = useState(shouldShowLoader);
  const opacity = useState(new Animated.Value(shouldShowLoader ? 1 : 0))[0];
  const webViewKey = `asset-note-${shouldShowLoader ? "content" : "empty"}-${
    safeText.length
  }`;

  const htmlContent = `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          margin: 0;
          font-size: 14px; 
          padding: 10px; 
          color: #000; 
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
        }
        span, div { white-space: pre-wrap; }
      </style>
    </head>
    <body>${safeText}</body>
  </html>
`;

  const handleLoadEnd = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(shouldShowLoader);
    opacity.setValue(shouldShowLoader ? 1 : 0);
  }, [opacity, shouldShowLoader, safeText]);

  if (!shouldShowLoader) {
    return (
      <View style={styles.emptyContainer}>
        <AssetListEmptyState
          fullHeight
          iconName="document-text-outline"
          title="Chưa có ghi chú"
          subtitle="Thông tin ghi chú sẽ hiển thị tại đây khi có dữ liệu."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        key={webViewKey}
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled
        onLoadStart={() => {
          if (shouldShowLoader) {
            opacity.setValue(1);
            setLoading(true);
          }
        }}
        onLoadEnd={handleLoadEnd}
      />
      {shouldShowLoader && loading && (
        <Animated.View style={[styles.loadingOverlay, { opacity }]}>
          <IsLoading size="large" color={C.red} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
  },

  webview: {
    flex: 1,
    width: Dimensions.get("window").width,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
});
