import { useState } from "react";
import { Platform, View, useColorScheme } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { formatHHMM, parseTime } from "../../../utils/Time";
import IosSpinnerPickerSheet from "../../dataPicker/shared/IosSpinnerPickerSheet";
import PickerFieldTrigger from "../../dataPicker/shared/PickerFieldTrigger";
import { C } from "../../../utils/helpers/colors";

export const TimePickerModalIOS = ({
  value,
  onChange,
}: {
  value?: string;
  onChange: (val: string) => void;
}) => {
  const isDark = useColorScheme() === "dark";
  const [showPicker, setShowPicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date>(parseTime(value));

  const handleTimeChange = (_: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempTime(selectedDate);
    }
  };

  const handleConfirmTime = () => {
    onChange(formatHHMM(tempTime));
    setShowPicker(false);
  };

  const handleCancelTime = () => {
    setTempTime(parseTime(value));
    setShowPicker(false);
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

      <IosSpinnerPickerSheet
        visible={showPicker}
        onCancel={handleCancelTime}
        onConfirm={handleConfirmTime}
      >
        <DateTimePicker
          value={tempTime}
          mode="time"
          display="spinner"
          is24Hour
          onChange={handleTimeChange}
          textColor={C.text}
          {...(Platform.OS === "ios"
            ? { themeVariant: isDark ? "dark" : "light" }
            : {})}
        />
      </IosSpinnerPickerSheet>
    </View>
  );
};
