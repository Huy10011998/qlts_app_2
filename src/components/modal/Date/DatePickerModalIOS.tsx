import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { formatDMY, parseDate } from "../../../utils/Date";
import IosSpinnerPickerSheet from "../../dataPicker/shared/IosSpinnerPickerSheet";
import PickerFieldTrigger from "../../dataPicker/shared/PickerFieldTrigger";

export const DatePickerModalIOS = ({
  value,
  onChange,
}: {
  value?: string;
  onChange: (val: string) => void;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(
    value ? parseDate(value) : new Date(),
  );

  useEffect(() => {
    if (value) {
      setTempDate(parseDate(value));
    }
  }, [value]);

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
      <PickerFieldTrigger
        iconName="calendar-outline"
        placeholder="Chọn Ngày (dd-MM-yyyy)"
        value={value}
        onPress={() => {
          setTempDate(parseDate(value));
          setShowPicker(true);
        }}
      />

      <IosSpinnerPickerSheet
        visible={showPicker}
        onCancel={handleCancelDate}
        onConfirm={handleConfirmDate}
      >
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="spinner"
          onChange={handleDateChange}
          textColor="#000"
          {...(Platform.OS === "ios" ? { themeVariant: "light" } : {})}
        />
      </IosSpinnerPickerSheet>
    </View>
  );
};
