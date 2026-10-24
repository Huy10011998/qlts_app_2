import React from "react";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigation } from "../../../types";
import { C } from "../../../utils/helpers/colors";
import SettingSectionGroup from "../shared/SettingSectionGroup";
import { getSettingGroupColor } from "../shared/settingGroups";
import { SettingRowItem } from "../shared/SettingRowItem";

/** Nhóm Hỗ trợ: tài liệu hướng dẫn và câu hỏi thường gặp. */
export default function SupportSettingGroup() {
  const navigation = useNavigation<StackNavigation<"SettingGroup">>();

  return (
    <SettingSectionGroup accent={getSettingGroupColor("support")}>
      <SettingRowItem
        iconName="book-outline"
        iconBg={C.emerald}
        label="Hướng dẫn sử dụng"
        sublabel="Các bước dùng từng chức năng"
        onPress={() => navigation.navigate("Guide")}
      />
      <SettingRowItem
        iconName="help-circle-outline"
        iconBg={C.violet}
        label="Câu hỏi thường gặp"
        sublabel="Lỗi kết nối, quyền, Face ID, Workflow"
        isLast
        onPress={() =>
          navigation.navigate("GuideTopic", {
            topicId: "faq",
            titleHeader: "Câu hỏi thường gặp",
          })
        }
      />
    </SettingSectionGroup>
  );
}
