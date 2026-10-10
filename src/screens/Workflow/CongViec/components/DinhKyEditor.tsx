import React, { useMemo } from "react";
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

import type { CongViecDinhKyPayload } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import DateTimeField from "../../shared/components/DateTimeField";
import {
  CV_DINH_KY_MAX_LAN,
  CV_KIEU_LAP,
  CV_KIEU_LAP_TUAN,
  CV_THU_TRONG_TUAN,
} from "../../shared/workflowConstants";
import { toBeDate } from "../../shared/workflowDate";
import {
  buildDinhKyDates,
  DinhKyInput,
  formatDinhKyDate,
  formatDinhKyTime,
  validateDinhKyDates,
} from "../dinhKyRules";

/** Số lần hiện trong khung xem trước. */
const PREVIEW_COUNT = 6;

export type DinhKyState = {
  enabled: boolean;
  kieuLap: number;
  moiN: string;
  thuTrongTuan: number[];
  ngayBatDau: Date | null;
  /**
   * Ngày bắt đầu chưa bị sửa tay → đi theo ngày của Từ ngày (luật server:
   * Ngày bắt đầu trống = ngày của Từ ngày).
   */
  ngayBatDauAuto: boolean;
  ketThuc: "ngay" | "soLan";
  ketThucNgay: Date | null;
  soLan: string;
};

export const createDinhKyState = (ngayBatDau: Date | null): DinhKyState => ({
  enabled: false,
  kieuLap: CV_KIEU_LAP_TUAN,
  moiN: "1",
  thuTrongTuan: [],
  ngayBatDau,
  ngayBatDauAuto: true,
  ketThuc: "soLan",
  ketThucNgay: null,
  soLan: "4",
});

/** Trạng thái form → đầu vào của luật sinh (null khi tắt / chưa có ngày bắt đầu). */
export const toDinhKyInput = (state: DinhKyState): DinhKyInput | null => {
  if (!state.enabled || !state.ngayBatDau) return null;
  const soLan = Number(state.soLan);

  return {
    kieuLap: state.kieuLap,
    moiN: Number(state.moiN) || 0,
    thuTrongTuan: state.kieuLap === CV_KIEU_LAP_TUAN ? state.thuTrongTuan : [],
    ngayBatDau: state.ngayBatDau,
    ketThucNgay: state.ketThuc === "ngay" ? state.ketThucNgay : null,
    soLan: state.ketThuc === "soLan" && state.soLan !== "" && Number.isFinite(soLan) ? soLan : null,
  };
};

/** Trạng thái form → body `DinhKy` (null khi tắt). */
export const toDinhKyPayload = (state: DinhKyState): CongViecDinhKyPayload | null => {
  if (!state.enabled) return null;

  const soLan = Number(state.soLan);
  return {
    KieuLap: state.kieuLap,
    MoiN: Number(state.moiN) || 0,
    ThuTrongTuan:
      state.kieuLap === CV_KIEU_LAP_TUAN && state.thuTrongTuan.length
        ? [...state.thuTrongTuan].sort((a, b) => a - b).join(",")
        : null,
    NgayBatDau: state.ngayBatDau ? toBeDate(state.ngayBatDau) : "",
    KetThucNgay:
      state.ketThuc === "ngay" && state.ketThucNgay ? toBeDate(state.ketThucNgay) : null,
    SoLan: state.ketThuc === "soLan" && Number.isFinite(soLan) && state.soLan !== "" ? soLan : null,
  };
};

type Props = {
  value: DinhKyState;
  onChange: (value: DinhKyState) => void;
  /** Từ / Đến của form — chỉ lấy GIỜ và THỜI LƯỢNG cho mọi lần. */
  tuNgay: Date | null;
  denNgay: Date | null;
};

/**
 * Định kỳ — chỉ khi THÊM MỚI. Server sinh sẵn mọi lần ngay lúc lưu, mỗi lần một
 * công việc riêng; kết thúc theo ngày HOẶC theo số lần, tối đa 366 lần. Khung
 * xem trước dưới cùng chạy đúng luật sinh của server (`dinhKyRules.ts`).
 */
export default function DinhKyEditor({ value, onChange, tuNgay, denNgay }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const set = (patch: Partial<DinhKyState>) => onChange({ ...value, ...patch });
  const unit = CV_KIEU_LAP.find((item) => item.value === value.kieuLap)?.unit ?? "";

  const dates = useMemo(() => {
    const input = toDinhKyInput(value);
    return input ? buildDinhKyDates(input) : null;
  }, [value]);
  const datesError = dates ? validateDinhKyDates(dates) : null;

  const toggleThu = (thu: number) =>
    set({
      thuTrongTuan: value.thuTrongTuan.includes(thu)
        ? value.thuTrongTuan.filter((item) => item !== thu)
        : [...value.thuTrongTuan, thu],
    });

  return (
    <View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Lặp lại định kỳ</Text>
        <Switch
          value={value.enabled}
          onValueChange={(enabled) => set({ enabled })}
          trackColor={{ true: c.red, false: c.borderStrong }}
          thumbColor="#FFFFFF"
        />
      </View>

      {value.enabled ? (
        <>
          <Text style={styles.hint}>
            Ngày các lần tính từ Ngày bắt đầu; giờ và thời lượng mỗi lần lấy theo Từ ngày / Đến
            ngày ở trên.
          </Text>
          <View style={styles.segment}>
            {CV_KIEU_LAP.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[styles.segmentItem, value.kieuLap === item.value && styles.segmentActive]}
                onPress={() => set({ kieuLap: item.value })}
              >
                <Text
                  style={[styles.segmentText, value.kieuLap === item.value && styles.segmentTextActive]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inlineRow}>
            <Text style={styles.inlineText}>Lặp mỗi</Text>
            <TextInput
              value={value.moiN}
              onChangeText={(text) => set({ moiN: text.replace(/[^0-9]/g, "") })}
              keyboardType="number-pad"
              style={styles.smallInput}
              maxLength={3}
            />
            <Text style={styles.inlineText}>{unit}</Text>
          </View>

          {value.kieuLap === CV_KIEU_LAP_TUAN ? (
            <View style={styles.thuRow}>
              {CV_THU_TRONG_TUAN.map((thu) => {
                const active = value.thuTrongTuan.includes(thu.value);
                return (
                  <TouchableOpacity
                    key={thu.value}
                    style={[styles.thu, active && styles.thuActive]}
                    onPress={() => toggleThu(thu.value)}
                  >
                    <Text style={[styles.thuText, active && styles.thuTextActive]}>{thu.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <DateTimeField
            label="Ngày bắt đầu"
            required
            withTime={false}
            value={value.ngayBatDau}
            onChange={(ngayBatDau) => set({ ngayBatDau, ngayBatDauAuto: false })}
          />

          <Text style={styles.label}>Kết thúc</Text>
          <View style={styles.segment}>
            <TouchableOpacity
              style={[styles.segmentItem, value.ketThuc === "soLan" && styles.segmentActive]}
              onPress={() => set({ ketThuc: "soLan" })}
            >
              <Text style={[styles.segmentText, value.ketThuc === "soLan" && styles.segmentTextActive]}>
                Sau số lần
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentItem, value.ketThuc === "ngay" && styles.segmentActive]}
              onPress={() => set({ ketThuc: "ngay" })}
            >
              <Text style={[styles.segmentText, value.ketThuc === "ngay" && styles.segmentTextActive]}>
                Vào ngày
              </Text>
            </TouchableOpacity>
          </View>

          {value.ketThuc === "soLan" ? (
            <View style={styles.inlineRow}>
              <Text style={styles.inlineText}>Số lần</Text>
              <TextInput
                value={value.soLan}
                onChangeText={(text) => set({ soLan: text.replace(/[^0-9]/g, "") })}
                keyboardType="number-pad"
                style={styles.smallInput}
                maxLength={3}
              />
              <Text style={styles.inlineHint}>tối đa {CV_DINH_KY_MAX_LAN}</Text>
            </View>
          ) : (
            <DateTimeField
              label="Ngày kết thúc"
              required
              withTime={false}
              value={value.ketThucNgay}
              onChange={(ketThucNgay) => set({ ketThucNgay })}
            />
          )}

          {dates ? (
            <View style={[styles.preview, datesError ? styles.previewError : null]}>
              {datesError ? (
                <Text style={styles.previewErrorText}>{datesError}</Text>
              ) : (
                <>
                  <Text style={styles.previewTitle}>
                    Sẽ tạo {dates.length} công việc
                    {formatDinhKyTime(tuNgay, denNgay)
                      ? `, mỗi lần ${formatDinhKyTime(tuNgay, denNgay)}`
                      : ""}
                    :
                  </Text>
                  <Text style={styles.previewDates}>
                    {dates.slice(0, PREVIEW_COUNT).map(formatDinhKyDate).join(" · ")}
                    {dates.length > PREVIEW_COUNT ? ` · … (lần cuối ${formatDinhKyDate(dates[dates.length - 1])})` : ""}
                  </Text>
                </>
              )}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    switchLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 7,
      color: c.textSecondary,
    },
    segment: {
      flexDirection: "row",
      backgroundColor: c.surfaceAlt,
      borderRadius: 10,
      padding: 3,
      marginBottom: 12,
    },
    segmentItem: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: "center",
    },
    segmentActive: {
      backgroundColor: c.surface,
    },
    segmentText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textSub,
    },
    segmentTextActive: {
      color: c.red,
    },
    inlineRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    inlineText: {
      fontSize: 14,
      color: c.text,
    },
    smallInput: {
      width: 64,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 8,
      textAlign: "center",
      fontSize: 15,
      color: c.text,
      backgroundColor: c.input,
    },
    hint: {
      fontSize: 12,
      color: c.textSub,
      marginBottom: 10,
    },
    inlineHint: {
      fontSize: 12,
      color: c.textSub,
    },
    preview: {
      marginTop: 4,
      padding: 10,
      borderRadius: 10,
      backgroundColor: c.accentLight,
    },
    previewError: {
      backgroundColor: c.redSurface,
    },
    previewTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
    },
    previewDates: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 4,
    },
    previewErrorText: {
      fontSize: 13,
      color: c.red,
    },
    thuRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 12,
    },
    thu: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    thuActive: {
      backgroundColor: c.red,
      borderColor: c.red,
    },
    thuText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
    },
    thuTextActive: {
      color: "#FFFFFF",
    },
  });
