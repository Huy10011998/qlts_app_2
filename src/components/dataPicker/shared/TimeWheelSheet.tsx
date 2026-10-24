import React, { useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import PickerSheetFrame from "./PickerSheetFrame";
import { WheelColumnHandle } from "./WheelColumn";
import WheelGroup from "./WheelGroup";
import {
  AppColors,
  C,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
// Theo cài đặt giao diện trong app, không theo máy: chọn Sáng trong app mà máy
// đang Tối thì bánh xe giờ của iOS phải sáng như phần còn lại.
import { useColorScheme } from "../../../hooks/useColorScheme";

export type TimeOfDay = { hour: number; minute: number };

type TimeWheelSheetProps = {
  visible: boolean;
  /** Giờ đang có trong ô — mỗi lần mở sheet bắt đầu lại từ giá trị này. */
  value: TimeOfDay;
  onCancel: () => void;
  onConfirm: (time: TimeOfDay) => void;
  /** Có thì hiện nút "Xoá" để bỏ trống ô (trường không bắt buộc). */
  onClear?: () => void;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => pad2(i));
const MINUTE_LABELS = Array.from({ length: 60 }, (_, i) => pad2(i));

/** Mốc giờ hành chính hay dùng: vào ca, nghỉ trưa, vào chiều, tan ca. */
const PRESETS: readonly TimeOfDay[] = [
  { hour: 8, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 13, minute: 30 },
  { hour: 17, minute: 0 },
];

/** Chiều cao chuẩn của bánh xe UIDatePicker. */
const IOS_SPINNER_HEIGHT = 216;

/**
 * Bộ chọn giờ 24h trong bottom sheet, cộng hàng mốc giờ chọn nhanh.
 *
 * Khung (tiêu đề, mốc giờ, Huỷ – Xác nhận) giống nhau trên hai nền tảng, riêng
 * bánh xe thì khác: iOS giữ UIDatePicker gốc (trống xoay 3D, tiếng tách,
 * VoiceOver người dùng iPhone đã quen), Android dùng bánh xe tự vẽ thay cho
 * dialog hệ thống.
 */
export default function TimeWheelSheet({
  visible,
  value,
  onCancel,
  onConfirm,
  onClear,
}: TimeWheelSheetProps) {
  const [draft, setDraft] = useState(value);

  // Như bộ chọn ngày: mở lại thì bắt đầu từ giá trị trong ô, và bánh xe dựng
  // lại để cuộn sẵn tới đúng chỗ.
  const [wasVisible, setWasVisible] = useState(visible);
  const [session, setSession] = useState(0);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setDraft(value);
      setSession((n) => n + 1);
    }
  }

  return (
    <PickerSheetFrame
      visible={visible}
      title="Chọn giờ"
      onCancel={onCancel}
      onConfirm={() => onConfirm(draft)}
      onClear={onClear}
    >
      <TimeWheelBody key={session} draft={draft} onChange={setDraft} />
    </PickerSheetFrame>
  );
}

type TimeWheelBodyProps = {
  draft: TimeOfDay;
  onChange: React.Dispatch<React.SetStateAction<TimeOfDay>>;
};

function TimeWheelBody({ draft, onChange }: TimeWheelBodyProps) {
  const styles = useStyles(makeStyles);
  const hourRef = useRef<WheelColumnHandle>(null);
  const minuteRef = useRef<WheelColumnHandle>(null);

  const now = new Date();
  const nowTime = { hour: now.getHours(), minute: now.getMinutes() };

  const jumpTo = (time: TimeOfDay) => {
    onChange(time);
    // Bánh xe gốc của iOS bám theo `draft` nên tự nhảy; bánh xe tự vẽ chỉ nhận
    // vị trí lúc mount nên phải bảo nó lăn tới.
    hourRef.current?.scrollToIndex(time.hour);
    minuteRef.current?.scrollToIndex(time.minute);
  };

  const chips = [
    { key: "now", label: "Bây giờ", time: nowTime },
    ...PRESETS.map((time) => ({
      key: `${time.hour}:${time.minute}`,
      label: `${pad2(time.hour)}:${pad2(time.minute)}`,
      time,
    })),
  ];

  return (
    <View>
      {Platform.OS === "ios" ? (
        <NativeTimeSpinner draft={draft} onChange={onChange} />
      ) : (
        <DrawnTimeWheels
          draft={draft}
          hourRef={hourRef}
          minuteRef={minuteRef}
          onChange={onChange}
        />
      )}

      {/* Một hàng, nằm giữa khi vừa; chữ phóng to không vừa thì cuộn ngang
          thay vì rớt chip cuối xuống dòng riêng. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroller}
        contentContainerStyle={styles.chipRow}
      >
        {chips.map((chip) => {
          const active =
            chip.time.hour === draft.hour && chip.time.minute === draft.minute;
          return (
            <Pressable
              key={chip.key}
              onPress={() => jumpTo(chip.time)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

type DrawnTimeWheelsProps = {
  draft: TimeOfDay;
  hourRef: React.RefObject<WheelColumnHandle | null>;
  minuteRef: React.RefObject<WheelColumnHandle | null>;
  onChange: React.Dispatch<React.SetStateAction<TimeOfDay>>;
};

/** Hai bánh xe tự vẽ (Android), chung một dải chọn ở giữa. */
function DrawnTimeWheels({
  draft,
  hourRef,
  minuteRef,
  onChange,
}: DrawnTimeWheelsProps) {
  return (
    <WheelGroup
      columns={[
        {
          accessibilityLabel: "Giờ",
          labels: HOUR_LABELS,
          initialIndex: draft.hour,
          wheelRef: hourRef,
          onChange: (hour) => onChange((t) => ({ ...t, hour })),
        },
        {
          accessibilityLabel: "Phút",
          labels: MINUTE_LABELS,
          initialIndex: draft.minute,
          wheelRef: minuteRef,
          onChange: (minute) => onChange((t) => ({ ...t, minute })),
        },
      ]}
    />
  );
}

type NativeTimeSpinnerProps = {
  draft: TimeOfDay;
  onChange: (time: TimeOfDay) => void;
};

/** UIDatePicker gốc, điều khiển hoàn toàn bằng `draft`. */
function NativeTimeSpinner({ draft, onChange }: NativeTimeSpinnerProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const isDark = useColorScheme() === "dark";
  const value = useMemo(() => {
    const date = new Date();
    date.setHours(draft.hour, draft.minute, 0, 0);
    return date;
  }, [draft.hour, draft.minute]);

  return (
    <View style={styles.nativeSpinnerBox}>
      <DateTimePicker
        value={value}
        mode="time"
        display="spinner"
        is24Hour
        textColor={c.text}
        themeVariant={isDark ? "dark" : "light"}
        onChange={(_, selected) => {
          if (selected) {
            onChange({ hour: selected.getHours(), minute: selected.getMinutes() });
          }
        }}
      />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    nativeSpinnerBox: {
      height: IOS_SPINNER_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
    },
    chipScroller: {
      flexGrow: 0,
      marginTop: 12,
      marginBottom: 4,
      // Kéo sát mép sheet để chip cuộn ra tới tận viền, không bị cắt ở lề.
      marginHorizontal: -16,
    },
    chipRow: {
      flexGrow: 1,
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 16,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    chipActive: {
      backgroundColor: c.redSurface,
      borderColor: C.red,
    },
    chipPressed: {
      opacity: 0.6,
    },
    chipText: {
      fontSize: 14,
      fontWeight: "600",
      color: c.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    chipTextActive: {
      color: C.red,
    },
  });
