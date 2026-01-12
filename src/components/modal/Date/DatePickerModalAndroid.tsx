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
import { formatDMY, parseDate } from "../../../utils/Date";

export const DatePickerModalAndroid = ({
  value,
  onChange,
}: {
  value?: string;
  onChange: (val: string) => void;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(parseDate(value));

  // ✅ sync khi value từ cha thay đổi
  useEffect(() => {
    setTempDate(parseDate(value));
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
      <TouchableOpacity
        style={styles.input}
        activeOpacity={0.8}
        onPress={() => {
          setTempDate(parseDate(value));
          setShowPicker(true);
        }}
      >
        <Text style={{ color: value ? "#000" : "#999", flex: 1 }}>
          {value || "Chọn Ngày (dd-MM-yyyy)"}
        </Text>

        <Ionicons name="calendar-outline" size={24} color="#FF3333" />
      </TouchableOpacity>

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
