import { useState } from "react";
import { Platform, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { formatHHMM, parseTime } from "../../../utils/Time";
import IosSpinnerPickerSheet from "../../dataPicker/shared/IosSpinnerPickerSheet";
import PickerFieldTrigger from "../../dataPicker/shared/PickerFieldTrigger";

export const TimePickerModalIOS = ({
  value,
  onChange,
}: {
  value?: string;
  onChange: (val: string) => void;
}) => {
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
          textColor="#000"
          {...(Platform.OS === "ios" ? { themeVariant: "light" } : {})}
        />
      </IosSpinnerPickerSheet>
    </View>
  );
};
