import React from "react";
import { View, StyleSheet } from "react-native";
import QrReview from "../../components/qrcode/QrReview";

export default function QrReviewScreen() {
  return (
    <View style={styles.container}>
      <QrReview />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
});
