import type { Field } from "../../types/model.d";
import { TypeProperty } from "../Enum";
import { formatDMY } from "../Date";
import { formatHHMM } from "../Time";

/**
 * Giá trị mặc định khai trên TỪNG FIELD trong metadata (`dbo.ClassAttributes`).
 *
 * Port thẳng từ `Utilities.ConvertDefaultValueProperty(fields)` bên web
 * (QLTS.Shared/Utilities/Utilities.cs, vùng #region Convert Data Default). Lệch
 * luật này là dòng tạo từ mobile khác dòng tạo từ web.
 *
 * Chỉ 5 loại field có default:
 *
 *   typeProperty                    đọc cột          quy tắc
 *   ------------------------------  ---------------  ---------------------------
 *   2 Int · 6 Reference · 10 Enum   defaultValue     parse ra INT được thì gán
 *   3 Decimal                       defaultValue     parse ra DECIMAL được thì gán
 *   7 Date                          defaultDateNow   true -> ngày hiện tại
 *   8 Time                          defaultTimeNow   true -> giờ hiện tại
 *
 * Còn lại (String, Text, Bool, Link, Image, List): KHÔNG có default. Admin cũng
 * không có ô khai cho mấy loại đó.
 *
 * VÌ SAO PHẢI LÀ `switch` THEO TYPE, không phải `if (defaultValue)`:
 * metadata production có dữ liệu rác do người khai copy dòng, và cấu trúc
 * switch là thứ tự động loại nó — mỗi field chỉ chạy ĐÚNG MỘT nhánh, nhánh nào
 * chỉ đọc cột của nhánh đó, nên cột rác ở loại field khác không bao giờ đụng
 * vào nhau:
 *
 *   · Nhiều field Date đang có `defaultValue = '1'` và cả
 *     `referenceName = 'DM_TienTe'` (Camera.NgayBaoHanh, DauGhi.NgayKhauHao).
 *     Loại Date không đọc `defaultValue` nên web BỎ QUA — áp vào là ra ngày
 *     01/01/0001.
 *   · `CongCuDungCu.IsDanMa` (Bool) có `defaultValue = '1'` nhưng web KHÔNG áp
 *     default cho Bool. Áp vào là mobile tick sẵn mà web thì không.
 *
 * Nguyên tắc: chỉ đọc đúng cột mà loại field đó được phép đọc, không "đoán ý"
 * người khai metadata.
 *
 * Chỉ áp KHI THÊM MỚI. Sửa dòng cũ không áp gì; web còn không áp cả khi bấm
 * "Sao chép" (nhân bản giữ nguyên giá trị dòng gốc).
 *
 * Đây là luật của ClassAttributes. `getInitialParameterValue`
 * (`src/components/report/ReportView.helpers.ts`) là luật của
 * ReportConfigParameter — có thêm `defaultYearNow`, `FIRST_DAY_MONTH`, và có
 * default cho Bool/String. Hai luật KHÁC NHAU CÓ CHỦ ĐÍCH, đừng gộp.
 */

export type FieldDefault = { has: boolean; value?: any };

const NO_DEFAULT: FieldDefault = { has: false };

/** Parse int chặt: chỉ nhận chuỗi số nguyên nguyên vẹn (loại "1.5", "1abc", "true"). */
const parseIntStrict = (raw?: string | null): number | null => {
  if (typeof raw !== "string") return null;

  const value = raw.trim();

  if (!/^-?\d+$/.test(value)) return null;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) ? parsed : null;
};

const parseDecimalStrict = (raw?: string | null): number | null => {
  if (typeof raw !== "string") return null;

  const value = raw.trim();

  if (value === "") return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * `now` truyền vào được để test bơm mốc thời gian cố định. Ngày giờ lấy từ ĐỒNG
 * HỒ THIẾT BỊ (web dùng `DateTime.Now` của máy client), không gọi server lấy giờ.
 */
export const getFieldDefault = (
  field: Field,
  now: Date = new Date(),
): FieldDefault => {
  const hasDefaultValue =
    typeof field.defaultValue === "string" && field.defaultValue.trim() !== "";

  switch (field.typeProperty) {
    case TypeProperty.Int:
    case TypeProperty.Reference:
    case TypeProperty.Enum: {
      if (!hasDefaultValue) return NO_DEFAULT;

      const value = parseIntStrict(field.defaultValue);

      return value === null ? NO_DEFAULT : { has: true, value };
    }

    case TypeProperty.Decimal: {
      if (!hasDefaultValue) return NO_DEFAULT;

      const value = parseDecimalStrict(field.defaultValue);

      return value === null ? NO_DEFAULT : { has: true, value };
    }

    /* Date/Time CHỈ đọc 2 cờ boolean, tuyệt đối không đọc `defaultValue`. */
    case TypeProperty.Date:
      return field.defaultDateNow === true
        ? { has: true, value: formatDMY(now) }
        : NO_DEFAULT;

    case TypeProperty.Time:
      return field.defaultTimeNow === true
        ? { has: true, value: formatHHMM(now) }
        : NO_DEFAULT;

    /* String · Text · Bool · Link · Image · List: không có default. */
    default:
      return NO_DEFAULT;
  }
};

/** Bộ default của một class, tính một lần theo `fieldActive`. */
export const buildFieldDefaults = (
  fields: Field[],
  now: Date = new Date(),
): Record<string, any> => {
  const defaults: Record<string, any> = {};

  for (const field of fields ?? []) {
    if (!field?.name) continue;

    const result = getFieldDefault(field, now);

    if (result.has) {
      defaults[field.name] = result.value;
    }
  }

  return defaults;
};
