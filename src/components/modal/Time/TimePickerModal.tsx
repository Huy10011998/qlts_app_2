import { useState } from "react";
import { View } from "react-native";
import { parseTime } from "../../../utils/Time";
import PickerFieldTrigger from "../../dataPicker/shared/PickerFieldTrigger";
import TimeWheelSheet, {
  TimeOfDay,
} from "../../dataPicker/shared/TimeWheelSheet";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Ô trống hoặc chuỗi hỏng thì bánh xe mở ở giờ hiện tại. */
const toTimeOfDay = (value?: string): TimeOfDay => {
  const date = parseTime(value);
  const hour = date.getHours();
  const minute = date.getMinutes();
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    const now = new Date();
    return { hour: now.getHours(), minute: now.getMinutes() };
  }
  return { hour, minute };
};

/**
 * Ô chọn giờ, dùng chung iOS và Android. Bấm ô mở sheet chọn giờ: cùng khung
 * và mốc giờ nhanh, bánh xe thì theo nền tảng (xem `TimeWheelSheet`).
 */
export const TimePickerModal = ({
  clearable = false,
  disabled = false,
  value,
  onChange,
}: {
  /** Trường không bắt buộc: sheet có nút "Xoá" khi ô đang có giá trị. */
  clearable?: boolean;
  disabled?: boolean;
  value?: string;
  onChange: (val: string) => void;
}) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View>
      <PickerFieldTrigger
        iconName="time-outline"
        disabled={disabled}
        placeholder="Chọn giờ"
        value={value}
        onPress={() => setShowPicker(true)}
      />

      <TimeWheelSheet
        visible={showPicker}
        value={toTimeOfDay(value)}
        onCancel={() => setShowPicker(false)}
        onConfirm={(time) => {
          setShowPicker(false);
          onChange(`${pad2(time.hour)}:${pad2(time.minute)}`);
        }}
        onClear={
          clearable && value
            ? () => {
                setShowPicker(false);
                onChange("");
              }
            : undefined
        }
      />
    </View>
  );
};
