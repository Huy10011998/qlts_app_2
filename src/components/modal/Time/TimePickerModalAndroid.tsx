import { useState, useEffect } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "react-native-vector-icons/Ionicons";
import { formatHHMM, parseTime } from "../../../utils/Time";

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

  const handleTimeChange = (_: any, selectedDate?: Date) => {
    setShowPicker(false);

    if (!selectedDate) return;

    setTempTime(selectedDate);
    onChange(formatHHMM(selectedDate));
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.input}
        activeOpacity={0.8}
        onPress={() => {
          setTempTime(parseTime(value));
          setShowPicker(true);
        }}
      >
        <Text style={{ color: value ? "#000" : "#999", flex: 1 }}>
          {value || "Chọn giờ (HH:mm)"}
        </Text>

        <Ionicons name="time-outline" size={24} color="#FF3333" />
      </TouchableOpacity>

      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          display="default"
          is24Hour
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
});
