import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { DatePicker, TimePicker } from "../../../../components/dataPicker/DataPicker";
import { AppColors, useStyles } from "../../../../utils/helpers/colors";
import { fromPickerDateTime, toPickerDate, toPickerTime } from "../workflowDate";

type Props = {
  label: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  required?: boolean;
  /** false: chỉ chọn ngày (ngày của kế hoạch, ngày bắt đầu định kỳ). */
  withTime?: boolean;
  error?: string | null;
};

/** Ô ngày + giờ tách đôi (form công việc: Từ ngày / Đến ngày, gia hạn). */
export default function DateTimeField({
  label,
  value,
  onChange,
  required,
  withTime = true,
  error,
}: Props) {
  const styles = useStyles(makeStyles);
  const dateValue = toPickerDate(value);
  const timeValue = toPickerTime(value) || "08:00";

  return (
    <View style={styles.block}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View style={styles.row}>
        <View style={withTime ? styles.date : styles.full}>
          <DatePicker
            value={dateValue}
            placeholder="Chọn ngày"
            onChange={(next) => onChange(fromPickerDateTime(next, withTime ? timeValue : "00:00"))}
          />
        </View>
        {withTime ? (
          <View style={styles.time}>
            <TimePicker
              value={timeValue}
              onChange={(next) =>
                onChange(fromPickerDateTime(dateValue || toPickerDate(new Date()), next))
              }
            />
          </View>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    block: {
      marginBottom: 14,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 7,
      color: c.textSecondary,
    },
    required: {
      color: c.red,
    },
    row: {
      flexDirection: "row",
      gap: 8,
    },
    date: {
      flex: 1.5,
    },
    time: {
      flex: 1,
    },
    full: {
      flex: 1,
    },
    error: {
      marginTop: 4,
      fontSize: 12,
      color: c.red,
    },
  });
