import { Platform } from "react-native";
import { DatePickerModalIOS } from "../modal/DatePickerModalIOS";
import { DatePickerModalAndroid } from "../modal/DatePickerModalAndroid";

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
