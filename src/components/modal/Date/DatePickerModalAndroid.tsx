import { useState, useEffect } from "react";
import {
  Platform,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { formatDMY, parseDate } from "../../../utils/Date";
import PickerFieldTrigger from "../../dataPicker/shared/PickerFieldTrigger";

export const DatePickerModalAndroid = ({
  value,
  onChange,
}: {
  value?: string;
  onChange: (val: string) => void;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(parseDate(value));

  // sync khi value từ cha thay đổi
  useEffect(() => {
    if (value) {
      setTempDate(parseDate(value));
    }
  }, [value]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);

    // Nếu bấm Huỷ → bỏ qua
    if (event?.type === "dismissed") {
      return;
    }

    if (!selectedDate) return;

    setTempDate(selectedDate);
    onChange(formatDMY(selectedDate));
  };

  return (
    <View>
      <PickerFieldTrigger
        iconName="calendar-outline"
        placeholder="Chọn Ngày (dd-MM-yyyy)"
        value={value}
        onPress={() => {
          setTempDate(parseDate(value));
          setShowPicker(true);
        }}
      />

      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="spinner"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
};
