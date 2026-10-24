import React from "react";
import { Platform, Text, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import PickerSheetFrame from "../../dataPicker/shared/PickerSheetFrame";
import WheelGroup from "../../dataPicker/shared/WheelGroup";
import { useAppColors, useStyles } from "../../../utils/helpers/colors";
import { makeStyles } from "../CameraPlayback.styles";

const HOURS = Array.from({ length: 24 }, (_, value) => value);
const MINUTES_AND_SECONDS = Array.from({ length: 60 }, (_, value) => value);
const padTimePart = (value: number) => String(value).padStart(2, "0");
const HOUR_LABELS = HOURS.map(padTimePart);
const MINUTE_SECOND_LABELS = MINUTES_AND_SECONDS.map(padTimePart);

/** Ba cột trên máy 320dp: 3 × 72 + 2 dấu ":" vẫn lọt lòng sheet. */
const WHEEL_WIDTH = 72;

type PlaybackTimeSheetProps = {
  onClose: () => void;
  onConfirm: (seconds: number) => void;
  value: number | null;
  visible: boolean;
};

/**
 * Giờ:phút:giây bắt đầu xem lại. Khung giống mọi bộ chọn giờ trong app; iOS
 * giữ bánh xe gốc, Android dùng bánh xe tự vẽ — `Picker` của Android chỉ là
 * danh sách thả xuống, không cuộn được như bánh xe.
 *
 * Sheet này chỉ mount khi được mở (thế chỗ sheet lịch) nên giá trị ban đầu đọc
 * thẳng lúc mount.
 */
export default function PlaybackTimeSheet({
  onClose,
  onConfirm,
  value,
  visible,
}: PlaybackTimeSheetProps) {
  const c = useAppColors();
  const styles = useStyles(makeStyles);
  const [initial] = React.useState(() => {
    const now = new Date();
    return (
      value ?? now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
    );
  });
  const [hour, setHour] = React.useState(Math.floor(initial / 3600));
  const [minute, setMinute] = React.useState(Math.floor((initial % 3600) / 60));
  const [second, setSecond] = React.useState(initial % 60);

  const columns = [
    { label: "Giờ", items: HOURS, value: hour, set: setHour },
    { label: "Phút", items: MINUTES_AND_SECONDS, value: minute, set: setMinute },
    { label: "Giây", items: MINUTES_AND_SECONDS, value: second, set: setSecond },
  ];

  return (
    <PickerSheetFrame
      visible={visible}
      title="Thời gian bắt đầu"
      cancelLabel="Quay lại"
      onCancel={onClose}
      onConfirm={() => onConfirm(hour * 3600 + minute * 60 + second)}
    >
      {Platform.OS === "ios" ? (
        <View style={styles.timePickerRow}>
          {columns.map((column, index) => (
            <React.Fragment key={column.label}>
              {index > 0 ? <Text style={styles.timePickerColon}>:</Text> : null}
              <Picker
                style={styles.timePickerColumn}
                itemStyle={styles.timePickerItem}
                selectedValue={column.value}
                onValueChange={(next) => column.set(Number(next))}
              >
                {column.items.map((item) => (
                  <Picker.Item
                    key={item}
                    label={padTimePart(item)}
                    value={item}
                    color={c.text}
                  />
                ))}
              </Picker>
            </React.Fragment>
          ))}
        </View>
      ) : (
        <WheelGroup
          wheelWidth={WHEEL_WIDTH}
          columns={columns.map((column) => ({
            accessibilityLabel: column.label,
            labels: column.items === HOURS ? HOUR_LABELS : MINUTE_SECOND_LABELS,
            initialIndex: column.value,
            onChange: column.set,
          }))}
        />
      )}
    </PickerSheetFrame>
  );
}
