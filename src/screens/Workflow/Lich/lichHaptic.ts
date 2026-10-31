import ReactNativeHapticFeedback from "react-native-haptic-feedback";

/** Rung rất nhẹ khi chọn ngày / sang tháng, tuần khác trên lịch. */
export const selectionHaptic = () => {
  try {
    ReactNativeHapticFeedback.trigger("selection", {
      enableVibrateFallback: false,
      ignoreAndroidSystemSettings: false,
    });
  } catch {
    // Rung chỉ là gia vị, máy không hỗ trợ thì bỏ qua.
  }
};
