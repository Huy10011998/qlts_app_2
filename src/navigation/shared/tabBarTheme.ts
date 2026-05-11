import { StyleSheet } from "react-native";

export const TAB_HEIGHT = 56;
export const TAB_ACTIVE_COLOR = "#E31E24";
export const TAB_INVERTED_BG = "#3A3A3A";
export const TAB_INVERTED_INACTIVE_COLOR = "rgba(255,255,255,0.68)";

export const tabBarStyles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});

type TabBarStyleParams = {
  bottomInset: number;
  backgroundColor?: string;
  borderTopColor?: string;
};

export const createTabBarStyle = ({
  bottomInset,
  backgroundColor = "#fff",
  borderTopColor,
}: TabBarStyleParams) => ({
  backgroundColor,
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor,
  height: TAB_HEIGHT + bottomInset,
  paddingBottom: bottomInset,
});
