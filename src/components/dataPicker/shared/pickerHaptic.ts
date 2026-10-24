import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const HAPTIC_OPTIONS = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false,
};

/**
 * Bánh xe lướt nhanh đi qua cả chục ô trong vài trăm mili giây; rung từng ô thì
 * máy Android dùng motor rung thường nghe như rè. Chặn tối đa một nhịp mỗi
 * khoảng này cho cảm giác "tách tách" như bánh xe của iOS.
 */
const MIN_INTERVAL_MS = 45;

let lastAt = 0;

export const pickerTickHaptic = () => {
  const now = Date.now();
  if (now - lastAt < MIN_INTERVAL_MS) return;
  lastAt = now;

  try {
    ReactNativeHapticFeedback.trigger("selection", HAPTIC_OPTIONS);
  } catch {
    // Rung chỉ là gia vị, máy không hỗ trợ thì bỏ qua.
  }
};
