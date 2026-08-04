import React from "react";

import { getScreenTitle, headerWithBack } from "./navigationOptions";
import {
  HOME_STACK_ROUTE_TITLE_SCREENS,
  HOME_STACK_STATIC_SCREENS,
} from "./homeStackConfig";
import ShareholdersMeetingScannerScreen from "../../screens/ShareholdersMeeting/ShareholdersMeetingScannerScreen";

type StackWithScreen = {
  Screen: React.ComponentType<any>;
};

/**
 * Các màn chi tiết dùng chung giữa HomeStack, FeatureStack và CameraStack.
 *
 * Các tab đều mở được cùng một chức năng (Trang chủ qua hàng shortcut, tab
 * Chức năng qua danh mục đầy đủ), nên mỗi stack phải tự đăng ký các màn này để
 * điều hướng xảy ra trong stack của tab đang đứng — bấm Tài sản ở tab nào thì
 * back cũng quay về đúng tab đó, và mỗi tab giữ history riêng.
 *
 * `exclude` dành cho stack đã dùng một trong các màn này làm màn gốc (tab
 * Camera), vì hai route cùng tên trong một navigator là lỗi.
 */
export function renderSharedStackScreens(
  Stack: StackWithScreen,
  options?: { exclude?: string[] },
) {
  const { Screen } = Stack;
  const excluded = new Set(options?.exclude ?? []);

  return [
    ...HOME_STACK_STATIC_SCREENS.filter(
      (screen) => !excluded.has(screen.name),
    ).map((screen) => (
      <Screen
        key={screen.name}
        name={screen.name}
        component={screen.component}
        options={({ route }: any) => ({
          title: getScreenTitle(
            (route.params as { titleHeader?: string } | undefined)?.titleHeader,
            screen.title,
          ),
          ...headerWithBack,
        })}
      />
    )),
    <Screen
      key="ShareholdersMeetingScanner"
      name="ShareholdersMeetingScanner"
      component={ShareholdersMeetingScannerScreen}
      options={{ headerShown: false }}
    />,
    ...HOME_STACK_ROUTE_TITLE_SCREENS.filter(
      (screen) => !excluded.has(screen.name),
    ).map((screen) => (
      <Screen
        key={screen.name}
        name={screen.name}
        component={screen.component}
        options={({ route }: any) => ({
          title: getScreenTitle(route.params?.titleHeader, screen.fallbackTitle),
          ...headerWithBack,
        })}
      />
    )),
  ];
}
