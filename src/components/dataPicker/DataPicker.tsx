import { Platform } from "react-native";
import { DatePickerModalAndroid } from "../modal/Date/DatePickerModalAndroid";
import { DatePickerModalIOS } from "../modal/Date/DatePickerModalIOS";
import { TimePickerModalIOS } from "../modal/Time/TimePickerModalIOS";
import { TimePickerModalAndroid } from "../modal/Time/TimePickerModalAndroid";

type Props = {
  value?: string;
  onChange: (val: string) => void;
};

export const DatePicker = ({ value, onChange }: Props) => {
  if (Platform.OS === "ios") {
    return <DatePickerModalIOS value={value} onChange={onChange} />;
  }

  return <DatePickerModalAndroid value={value} onChange={onChange} />;
};

export const TimePicker = ({ value, onChange }: Props) => {
  if (Platform.OS === "ios") {
    return <TimePickerModalIOS value={value} onChange={onChange} />;
  }

  return <TimePickerModalAndroid value={value} onChange={onChange} />;
};
