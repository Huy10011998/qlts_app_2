import React from "react";
import CameraList from "../../components/camera/CameraList";
import ScreenContainer from "../shared/ScreenContainer";

export default function CameraListScreen() {
  return (
    <ScreenContainer backgroundColor="#F3F4F6">
      <CameraList />
    </ScreenContainer>
  );
}
