import { DatePickerModal } from "../modal/Date/DatePickerModal";
import { TimePickerModal } from "../modal/Time/TimePickerModal";

type Props = {
  /** Trường không bắt buộc: bảng chọn có nút "Xoá" để bỏ trống ô. */
  clearable?: boolean;
  /** Trường bị khoá (vd. theo bản ghi cha): hiện giá trị, không cho mở chọn. */
  disabled?: boolean;
  value?: string;
  placeholder?: string;
  onChange: (val: string) => void;
};

type DateProps = Props & {
  /**
   * Ngày nhỏ / lớn nhất chọn được, cùng định dạng giá trị ("dd-MM-yyyy"). Ngày
   * ngoài khoảng mờ đi trên lịch — vd. Đến ngày lấy `minDate` là Từ ngày.
   */
  minDate?: string;
  maxDate?: string;
};

export const DatePicker = ({
  clearable,
  disabled,
  minDate,
  maxDate,
  value,
  placeholder,
  onChange,
}: DateProps) => (
  <DatePickerModal
    clearable={clearable}
    disabled={disabled}
    minDate={minDate}
    maxDate={maxDate}
    value={value}
    placeholder={placeholder}
    onChange={onChange}
  />
);

export const TimePicker = ({ clearable, disabled, value, onChange }: Props) => (
  <TimePickerModal
    clearable={clearable}
    disabled={disabled}
    value={value}
    onChange={onChange}
  />
);
