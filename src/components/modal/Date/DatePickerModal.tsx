import { useState } from "react";
import { View } from "react-native";
import { formatDMY, parseDate } from "../../../utils/Date";
import PickerFieldTrigger from "../../dataPicker/shared/PickerFieldTrigger";
import CalendarDateSheet from "../../dataPicker/shared/CalendarDateSheet";
import {
  formatPickerDisplayDate,
  parsePickerDate,
} from "../../dataPicker/shared/pickerValue";

/** Ô trống hoặc chuỗi hỏng thì lịch mở ở hôm nay thay vì "Invalid Date". */
const toPickerDate = (value?: string) => {
  const date = parseDate(value);
  return Number.isNaN(date.getTime()) ? parseDate() : date;
};

/**
 * Ô chọn ngày, dùng chung iOS và Android. Bấm ô mở lịch tháng tự vẽ trong
 * bottom sheet — thay dialog bánh xe của Android (không đổi được giao diện) và
 * bánh xe ngày của iOS (không thấy thứ, hôm nay, cả tháng).
 *
 * Giá trị vào / ra luôn là "dd-MM-yyyy"; ô chỉ hiển thị dạng "dd/MM/yyyy".
 */
export const DatePickerModal = ({
  clearable = false,
  disabled = false,
  maxDate,
  minDate,
  value,
  placeholder = "Chọn ngày",
  onChange,
}: {
  /** Trường không bắt buộc: sheet có nút "Xoá" khi ô đang có giá trị. */
  clearable?: boolean;
  disabled?: boolean;
  /** Giới hạn trên / dưới, cùng định dạng giá trị ("dd-MM-yyyy"). */
  maxDate?: string;
  minDate?: string;
  value?: string;
  placeholder?: string;
  onChange: (val: string) => void;
}) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View>
      <PickerFieldTrigger
        iconName="calendar-outline"
        disabled={disabled}
        placeholder={placeholder}
        value={formatPickerDisplayDate(value)}
        onPress={() => setShowPicker(true)}
      />

      <CalendarDateSheet
        visible={showPicker}
        value={toPickerDate(value)}
        minDate={parsePickerDate(minDate)}
        maxDate={parsePickerDate(maxDate)}
        onCancel={() => setShowPicker(false)}
        onConfirm={(date) => {
          setShowPicker(false);
          onChange(formatDMY(date));
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
