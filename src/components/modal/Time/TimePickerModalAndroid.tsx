import { useState, useEffect } from "react";
import {
  Platform,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { formatHHMM, parseTime } from "../../../utils/Time";
import PickerFieldTrigger from "../../dataPicker/shared/PickerFieldTrigger";

export const TimePickerModalAndroid = ({
  value,
  onChange,
}: {
  value?: string;
  onChange: (val: string) => void;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date>(parseTime(value));

  // ✅ sync khi value từ cha thay đổi
  useEffect(() => {
    setTempTime(parseTime(value));
  }, [value]);

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);

    // ❌ Bấm CANCEL
    if (event.type === "dismissed") {
      return;
    }

    // ✅ Bấm OK
    if (event.type === "set" && selectedDate) {
      setTempTime(selectedDate);
      onChange(formatHHMM(selectedDate));
    }
  };

  return (
    <View>
      <PickerFieldTrigger
        iconName="time-outline"
        placeholder="Chọn giờ (HH:mm)"
        value={value}
        onPress={() => {
          setTempTime(parseTime(value));
          setShowPicker(true);
        }}
      />

      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          display="spinner"
          is24Hour={true}
          onChange={handleTimeChange}
          themeVariant="light"
        />
      )}
    </View>
  );
};
