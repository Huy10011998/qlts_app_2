import React from "react";
import { StyleSheet, Dimensions } from "react-native";
import { WebView } from "react-native-webview";
import { CenterTextProps } from "../../types";

export default function CenterTextWebView({ text }: CenterTextProps) {
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

  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html: htmlContent }}
      style={styles.webview}
      scrollEnabled={true}
    />
  );
}

const styles = StyleSheet.create({
  webview: {
    width: Dimensions.get("window").width,
    height: 200, // hoặc flex tùy container
  },
});
