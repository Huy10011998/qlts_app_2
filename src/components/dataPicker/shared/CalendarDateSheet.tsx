import React, { useState } from "react";
import CalendarPanel from "./CalendarPanel";
import PickerSheetFrame from "./PickerSheetFrame";
import { clampDay, DayLimits, formatLongDate } from "./calendarGrid";

type CalendarDateSheetProps = DayLimits & {
  visible: boolean;
  /** Ngày đang có trong ô — mỗi lần mở sheet bắt đầu lại từ giá trị này. */
  value: Date;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
  /** Có thì hiện nút "Xoá" để bỏ trống ô (trường không bắt buộc). */
  onClear?: () => void;
};

/**
 * Bộ chọn ngày dạng lịch tháng trong bottom sheet, dùng chung iOS và Android —
 * thay dialog bánh xe của Android (không đổi được màu, chữ, bố cục) và bánh xe
 * ngày của iOS.
 *
 * Ngày đang có nằm ngoài `minDate` / `maxDate` (vd. Đến ngày đang trước Từ
 * ngày) thì lịch mở ở ngày gần nhất còn hợp lệ.
 */
export default function CalendarDateSheet({
  visible,
  value,
  minDate,
  maxDate,
  onCancel,
  onConfirm,
  onClear,
}: CalendarDateSheetProps) {
  const [draft, setDraft] = useState(value);

  // Mở lại sheet thì bỏ hết thao tác dở của lần trước. Đặt lại ngay trong lúc
  // render (không chờ effect) để khung hình đầu tiên đã đúng ngày.
  const [wasVisible, setWasVisible] = useState(visible);
  const [session, setSession] = useState(0);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setDraft(clampDay(value, { minDate, maxDate }));
      setSession((n) => n + 1);
    }
  }

  return (
    <PickerSheetFrame
      visible={visible}
      title="Chọn ngày"
      headline={formatLongDate(draft)}
      onCancel={onCancel}
      onConfirm={() => onConfirm(draft)}
      onClear={onClear}
    >
      <CalendarPanel
        key={session}
        value={draft}
        onChange={setDraft}
        minDate={minDate}
        maxDate={maxDate}
      />
    </PickerSheetFrame>
  );
}
