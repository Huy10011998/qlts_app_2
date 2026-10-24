import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { StackRoute } from "../../types";
import { useAppColors } from "../../utils/helpers/colors";
import type { SettingGroupId } from "./shared/settingGroups";
import AccountSettingGroup from "./groups/AccountSettingGroup";
import SupportSettingGroup from "./groups/SupportSettingGroup";
import SystemSettingGroup from "./groups/SystemSettingGroup";
import AppInfoSettingGroup from "./groups/AppInfoSettingGroup";
import OtherSettingGroup from "./groups/OtherSettingGroup";

const GROUP_CONTENT: Record<SettingGroupId, React.ComponentType> = {
  account: AccountSettingGroup,
  support: SupportSettingGroup,
  system: SystemSettingGroup,
  appInfo: AppInfoSettingGroup,
  other: OtherSettingGroup,
};

/** Một nhóm của màn Cài đặt — tiêu đề header lấy theo nhóm (AppNavigator). */
export default function SettingGroupScreen() {
  const { params } = useRoute<StackRoute<"SettingGroup">>();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const Content = GROUP_CONTENT[params.group];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Content />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
