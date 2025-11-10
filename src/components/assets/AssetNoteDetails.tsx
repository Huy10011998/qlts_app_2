import React, { useState } from "react";
import { StyleSheet, Dimensions, View, Animated } from "react-native";
import { WebView } from "react-native-webview";
import { CenterTextProps } from "../../types";
import IsLoading from "../ui/IconLoading";

export default function AssetNoteDetails({ text }: CenterTextProps) {
  const [loading, setLoading] = useState(true);
  const opacity = useState(new Animated.Value(1))[0]; // animation cho overlay

  const htmlContent = `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-size: 14px; 
          padding: 10px; 
          color: #000; 
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
        }
        span, div { white-space: pre-wrap; }
      </style>
    </head>
    <body>${text}</body>
  </html>
`;

  const handleLoadEnd = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300, // mượt hơn
      useNativeDriver: true,
    }).start(() => setLoading(false));
  };

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled
        onLoadStart={() => setLoading(true)}
        onLoadEnd={handleLoadEnd}
      />
      {loading && (
        <Animated.View style={[styles.loadingOverlay, { opacity }]}>
          <IsLoading size="large" color="#FF3333" />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    width: Dimensions.get("window").width,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.6)", // nền mờ nhẹ
  },
});
