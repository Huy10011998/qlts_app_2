import React from "react";
import QrReview from "../../components/qrcode/QrReview";
import ScreenContainer from "../shared/ScreenContainer";

export default function QrReviewScreen() {
  return (
    <ScreenContainer backgroundColor="#F3F4F6">
      <QrReview />
    </ScreenContainer>
  );
}
