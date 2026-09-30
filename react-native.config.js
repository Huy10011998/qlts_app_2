module.exports = {
  assets: ["./node_modules/react-native-vector-icons/Fonts"],
  dependencies: {
    // Chỉ iOS dùng bản đồ gốc (Apple Maps). Android vẫn dùng WebView + Leaflet
    // (các file *.android.tsx) nên không link, tránh kéo SDK Google Maps + API key.
    "react-native-maps": { platforms: { android: null } },
  },
};
