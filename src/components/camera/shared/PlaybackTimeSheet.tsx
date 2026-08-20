import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import Ionicons from "react-native-vector-icons/Ionicons";
import BottomSheetModalShell from "../../shared/BottomSheetModalShell";
import { useAppColors, useStyles } from "../../../utils/helpers/colors";
import { makeStyles } from "../CameraPlayback.styles";

const HOURS = Array.from({ length: 24 }, (_, value) => value);
const MINUTES_AND_SECONDS = Array.from({ length: 60 }, (_, value) => value);
const padTimePart = (value: number) => String(value).padStart(2, "0");

type PlaybackTimeSheetProps = {
  onClose: () => void;
  onConfirm: (seconds: number) => void;
  value: number | null;
  visible: boolean;
};

export default function PlaybackTimeSheet({
  onClose,
  onConfirm,
  value,
  visible,
}: PlaybackTimeSheetProps) {
  const c = useAppColors();
  const styles = useStyles(makeStyles);
  const [hour, setHour] = React.useState(0);
  const [minute, setMinute] = React.useState(0);
  const [second, setSecond] = React.useState(0);

  React.useEffect(() => {
    if (!visible) return;

    const now = new Date();
    const initial =
      value ?? now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    setHour(Math.floor(initial / 3600));
    setMinute(Math.floor((initial % 3600) / 60));
    setSecond(initial % 60);
  }, [value, visible]);

  return (
    <BottomSheetModalShell
      visible={visible}
      onClose={onClose}
      sheetStyle={styles.timeSheet}
      statusBarTranslucent
    >
      <View style={styles.timeSheetHeader}>
        <TouchableOpacity
          style={styles.timeSheetHeaderBtn}
          onPress={onClose}
          accessibilityLabel="Quay lại lịch"
        >
          <Ionicons name="chevron-back" size={28} color={c.text} />
        </TouchableOpacity>
        <Text style={styles.timeSheetTitle}>
          Thời gian bắt đầu
        </Text>
        <TouchableOpacity
          style={styles.timeSheetHeaderBtn}
          onPress={() => onConfirm(hour * 3600 + minute * 60 + second)}
          accessibilityLabel="Xác nhận thời gian"
        >
          <Text style={styles.timeSheetConfirmText}>
            OK
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.timePickerRow}>
        <Picker
          style={styles.timePickerColumn}
          itemStyle={styles.timePickerItem}
          selectedValue={hour}
          onValueChange={(next) => setHour(Number(next))}
        >
          {HOURS.map((item) => (
            <Picker.Item
              key={item}
              label={padTimePart(item)}
              value={item}
              color={c.text}
            />
          ))}
        </Picker>
        <Text style={styles.timePickerColon}>
          :
        </Text>
        <Picker
          style={styles.timePickerColumn}
          itemStyle={styles.timePickerItem}
          selectedValue={minute}
          onValueChange={(next) => setMinute(Number(next))}
        >
          {MINUTES_AND_SECONDS.map((item) => (
            <Picker.Item
              key={item}
              label={padTimePart(item)}
              value={item}
              color={c.text}
            />
          ))}
        </Picker>
        <Text style={styles.timePickerColon}>
          :
        </Text>
        <Picker
          style={styles.timePickerColumn}
          itemStyle={styles.timePickerItem}
          selectedValue={second}
          onValueChange={(next) => setSecond(Number(next))}
        >
          {MINUTES_AND_SECONDS.map((item) => (
            <Picker.Item
              key={item}
              label={padTimePart(item)}
              value={item}
              color={c.text}
            />
          ))}
        </Picker>
      </View>
    </BottomSheetModalShell>
  );
}
