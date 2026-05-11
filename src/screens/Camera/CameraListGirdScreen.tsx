import React from "react";
import CameraListGrid from "../../components/camera/CameraListGrid";
import ScreenContainer from "../shared/ScreenContainer";

export default function CameraListGridScreen() {
  return (
    <ScreenContainer backgroundColor="#F3F4F6">
      <CameraListGrid />
    </ScreenContainer>
  );
}
