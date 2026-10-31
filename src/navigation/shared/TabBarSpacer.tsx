import React from "react";
import { View } from "react-native";

import { useTabBarOverlap } from "./tabBarTheme";

/**
 * Đặt cuối nội dung cuộn của màn gốc tab (hoặc làm `ListFooterComponent`): chừa
 * đúng phần đáy màn bị viên thanh tab nổi đè lên, để dòng cuối cuộn lên được
 * trên viên.
 */
export default function TabBarSpacer() {
  return <View pointerEvents="none" style={{ height: useTabBarOverlap() }} />;
}
