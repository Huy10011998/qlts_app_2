import { NativeModules, Platform } from "react-native";

type SplashGateNativeModule = {
  markAppReady: () => void;
};

const nativeModule: SplashGateNativeModule | undefined =
  NativeModules.SplashGate;

let hasMarkedAppReady = false;

/**
 * Báo cho splash native biết màn hình đầu tiên đã có nội dung thật, để nó gỡ
 * đúng lúc đó thay vì gỡ theo mốc thời gian cố định.
 *
 * Chỉ Android cần: iOS gỡ lớp phủ splash sau `splashHoldSeconds` trong
 * `AppDelegate.swift` và chuỗi bootstrap bên đó vốn xong trước mốc ấy. Android
 * đọc token qua Android Keystore (lần đầu tốn hàng trăm ms) rồi mới tới
 * permission và 2 API menu, nên hay vượt mốc — splash tắt giữa chừng là lộ ra
 * vòng xoay của RootNavigator rồi tới vòng xoay của Trang chủ.
 *
 * Gọi bao nhiêu lần cũng được: lượt đầu tiên tính, các lượt sau bỏ qua. Native
 * vẫn có trần thời gian riêng nên JS không báo được thì splash vẫn tự gỡ.
 */
export const markAppReady = () => {
  if (hasMarkedAppReady) return;
  if (Platform.OS !== "android") return;

  hasMarkedAppReady = true;
  nativeModule?.markAppReady();
};
