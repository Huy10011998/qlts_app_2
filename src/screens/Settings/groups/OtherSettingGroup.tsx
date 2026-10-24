import React from "react";
import { useNavigation } from "@react-navigation/native";
import { useTextScale } from "../../../context/FontScaleContext";
import type { StackNavigation } from "../../../types";
import { C } from "../../../utils/helpers/colors";
import SettingSectionGroup from "../shared/SettingSectionGroup";
import { getSettingGroupColor } from "../shared/settingGroups";
import { SettingRowItem } from "../shared/SettingRowItem";

/** Nhóm Khác: hiển thị và cỡ chữ. Đăng xuất nằm ngay màn Cài đặt chính. */
export default function OtherSettingGroup() {
  const navigation = useNavigation<StackNavigation<"SettingGroup">>();
  const { factor: textScaleFactor } = useTextScale();

  return (
    <SettingSectionGroup accent={getSettingGroupColor("other")}>
      <SettingRowItem
        iconName="contrast-outline"
        iconBg={C.violet}
        label="Hiển thị"
        sublabel="Theo thiết bị, giao diện sáng hoặc tối"
        onPress={() => navigation.navigate("Appearance")}
      />
      <SettingRowItem
        iconName="text-outline"
        iconBg={C.blue}
        label="Cỡ chữ"
        sublabel={`${Math.round(textScaleFactor * 100)}% • cỡ chữ toàn ứng dụng`}
        onPress={() => navigation.navigate("TextSize")}
        isLast
      />
    </SettingSectionGroup>
  );
}
