import { useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "react-native-vector-icons/Ionicons";
import { formatDMY, parseDate } from "../../../utils/Date";

export const DatePickerModalIOS = ({
  value,
  onChange,
}: {
  value?: string;
  onChange: (val: string) => void;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(parseDate(value));

  const handleDateChange = (_: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleConfirmDate = () => {
    onChange(formatDMY(tempDate));
    setShowPicker(false);
  };

  const handleCancelDate = () => {
    setTempDate(parseDate(value));
    setShowPicker(false);
  };

  return (
    <View style={{ position: "relative" }}>
      <TouchableOpacity
        style={styles.input}
        onPress={() => {
          setTempDate(parseDate(value));
          setShowPicker(true);
        }}
        activeOpacity={0.8}
      >
        <Text style={{ color: value ? "#000" : "#999", flex: 1 }}>
          {value || "Chọn Ngày (dd-MM-yyyy)"}
        </Text>

        <Ionicons name="time-outline" size={24} color="#FF3333" />
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={handleCancelDate}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1}>
          <View style={styles.pickerContainer}>
            <View style={styles.toolbar}>
              <TouchableOpacity onPress={handleCancelDate}>
                <Text style={styles.toolbarText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmDate}>
                <Text style={[styles.toolbarText, { fontWeight: "bold" }]}>
                  Chọn
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerBox}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                textColor="#000"
                {...(Platform.OS === "ios" ? { themeVariant: "light" } : {})}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  pickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },

  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  toolbarText: {
    fontSize: 18,
    color: "#FF3333",
  },

  datePickerBox: {
    backgroundColor: "#fff",
    height: 250,
    width: "100%",
    alignItems: "center",
  },
});
