import { AppRegistry } from "react-native";
import App from "./App";
import { name as appName } from "./app.json";
import { registerPushBackgroundHandlers } from "./src/services/notifications";

// Phải chạy ở phạm vi module, trước registerComponent: khi app bị kill, Android
// tạo một JS runtime mới chỉ chạy hết file này rồi gọi handler. Đăng ký bên trong
// component sẽ làm mất thông báo ở trạng thái quit.
registerPushBackgroundHandlers();

AppRegistry.registerComponent(appName, () => App);
