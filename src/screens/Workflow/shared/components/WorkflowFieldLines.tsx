import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { TypeProperty } from "../../../../utils/Enum";
import { AppColors, useStyles } from "../../../../utils/helpers/colors";
import { formatWorkflowValue, WorkflowField } from "../workflowFields";

type Props = {
  item: Record<string, any>;
  fields: WorkflowField[];
  /** Ẩn dòng trống ("---") cho thẻ gọn. */
  hideEmpty?: boolean;
};

/** Ảnh / link / base64 không in được thành chữ trên thẻ. */
const NOT_TEXT_TYPES = new Set<number>([
  TypeProperty.Image,
  TypeProperty.ImageBase64,
]);

/** Các dòng "Nhãn: giá trị" của phần động trên thẻ danh sách. */
export default function WorkflowFieldLines({ item, fields, hideEmpty = true }: Props) {
  const styles = useStyles(makeStyles);

  return (
    <View>
      {fields.map((field) => {
        if (NOT_TEXT_TYPES.has(field.typeProperty)) return null;

        const value = formatWorkflowValue(item, field);
        const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
        if (hideEmpty && (!text || text === "---" || text === "--")) return null;

        return (
          <View key={field.name} style={styles.line}>
            <Text style={styles.label} numberOfLines={1}>
              {field.moTa || field.name}:
            </Text>
            <Text
              style={styles.value}
              numberOfLines={field.typeProperty === TypeProperty.Text ? 2 : 1}
            >
              {text || "---"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    line: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginTop: 3,
    },
    label: {
      fontSize: 13,
      color: c.textSub,
      marginRight: 6,
      maxWidth: "42%",
    },
    value: {
      flex: 1,
      fontSize: 13,
      color: c.text,
    },
  });
