import type { Field } from "../../../types/index";
import { formatDateForBE, normalizeDateFromBE } from "../../../utils/Date";
import { TypeProperty } from "../../../utils/Enum";
import { getFieldValue } from "../../../utils/fields/GetFieldValue";
import { getMatchedKey } from "../../../utils/helpers/field";
import { formatBeDate } from "./workflowDate";

/**
 * Phần ĐỘNG của view Workflow: dựng thẻ / chi tiết / form từ metadata
 * (ClassAttributes của CV_CongViec, CV_KeHoach; FlowAttributes của phiếu).
 *
 * Tài liệu BE giả định bộ dựng DataClass của app đã sắp theo `stt` /
 * `stt_Grid`, lọc `isShowDetail`, hiện tên Enum ở `<name>_MoTa`, kèm giờ khi
 * `showTime`. Bộ dựng của màn Tài sản chưa làm các việc đó — viết riêng ở đây
 * để không đổi hành vi màn Tài sản.
 */

export type WorkflowField = Field & {
  /** Date có kèm giờ. ClassAttributes có, FlowAttributes không có. */
  showTime?: boolean;
};

const isOn = (value: unknown) =>
  value === true || value === 1 || value === "1" || value === "true";

const isOff = (value: unknown) =>
  value === false || value === 0 || value === "0" || value === "false";

/**
 * Chuẩn hoá 1 dòng metadata. Dùng cho cả FlowAttributes: chúng có ĐÚNG TÊN các
 * thuộc tính của ClassAttributes nên chuyển 1-1 (như MapField của web), thuộc
 * tính FlowAttributes không có thì để trống.
 *
 * Tài liệu ghi `stt_Grid` nhưng .NET đổi `STT_Grid` thành `stT_Grid` — đọc cả
 * hai. `isShowDetail` giữ nguyên null vì luật Flow ("khác false") và luật CV
 * ("bằng true") hiểu null khác nhau.
 */
export const normalizeWorkflowField = (
  raw: Record<string, any>,
  index = 0,
): WorkflowField => {
  const gridOrder = raw.stT_Grid ?? raw.stt_Grid ?? raw.STT_Grid;

  return {
    ...raw,
    id: raw.id ?? -(index + 1),
    name: String(raw.name ?? ""),
    moTa: raw.moTa ?? raw.name ?? "",
    typeProperty: Number(raw.typeProperty ?? TypeProperty.String),
    stt: Number(raw.stt ?? index),
    stT_Grid: gridOrder == null ? (null as any) : Number(gridOrder),
    isShowMobile: isOn(raw.isShowMobile),
    isShowGrid: isOn(raw.isShowGrid),
    isRequired: isOn(raw.isRequired),
    isReadOnly: isOn(raw.isReadOnly),
    isShowDetail:
      raw.isShowDetail == null ? (null as any) : isOn(raw.isShowDetail),
    isActive: raw.isActive == null ? true : !isOff(raw.isActive),
    showTime: isOn(raw.showTime),
  } as WorkflowField;
};

export const normalizeWorkflowFields = (raw: unknown): WorkflowField[] =>
  (Array.isArray(raw) ? raw : [])
    .map((item, index) => normalizeWorkflowField(item ?? {}, index))
    .filter((field) => field.name && field.isActive !== false);

const toNameSet = (names?: readonly string[]) =>
  new Set((names ?? []).map((name) => name.toLowerCase()));

const sortBy = (fields: WorkflowField[], orderOf: (f: WorkflowField) => number) =>
  fields
    .map((field, index) => ({ field, index }))
    .sort((a, b) => orderOf(a.field) - orderOf(b.field) || a.index - b.index)
    .map(({ field }) => field);

const gridOrderOf = (field: WorkflowField) =>
  Number(field.stT_Grid ?? field.stt ?? 0);

const formOrderOf = (field: WorkflowField) => Number(field.stt ?? 0);

/** Danh sách / thẻ: isShowMobile, theo stt_Grid (null thì lấy stt). */
export const getCardFields = (
  fields: WorkflowField[],
  exclude?: readonly string[],
) => {
  const excluded = toNameSet(exclude);

  return sortBy(
    fields.filter(
      (field) => field.isShowMobile && !excluded.has(field.name.toLowerCase()),
    ),
    gridOrderOf,
  );
};

/**
 * Xem chi tiết, theo stt. Flow: `isShowDetail != false` (gồm cả field chỉ đọc
 * như Số, Người lập). CV / KH: `isShowDetail = true`.
 */
export const getDetailFields = (
  fields: WorkflowField[],
  rule: "notFalse" | "true",
  exclude?: readonly string[],
) => {
  const excluded = toNameSet(exclude);

  return sortBy(
    fields.filter((field) => {
      if (excluded.has(field.name.toLowerCase())) return false;
      return rule === "true"
        ? field.isShowDetail === true
        : (field.isShowDetail as unknown) !== false;
    }),
    formOrderOf,
  );
};

/**
 * Form thêm / sửa: isReadOnly != true, theo stt. `only` dùng cho CV / KH —
 * API lưu không động, chỉ nhận một bộ khoá cố định, nên form chỉ hiện các
 * field nằm trong bộ đó (field mới vẫn hiện ở thẻ / chi tiết).
 */
export const getFormFields = (
  fields: WorkflowField[],
  options: { exclude?: readonly string[]; only?: readonly string[] } = {},
) => {
  const excluded = toNameSet(options.exclude);
  const only = options.only ? toNameSet(options.only) : null;

  return sortBy(
    fields.filter((field) => {
      const name = field.name.toLowerCase();
      if (field.isReadOnly || excluded.has(name)) return false;
      return only ? only.has(name) : true;
    }),
    formOrderOf,
  );
};

export const findWorkflowField = (fields: WorkflowField[], name: string) =>
  fields.find((field) => field.name.toLowerCase() === name.toLowerCase());

/** Giá trị theo tên field, không phân biệt hoa thường (ID_LoaiFlow ↔ iD_LoaiFlow). */
export const readItemValue = (
  item: Record<string, any> | null | undefined,
  name: string,
) => {
  if (!item) return undefined;
  const key = getMatchedKey(item, name);
  return key ? item[key] : undefined;
};

/**
 * Giá trị hiển thị: Reference / Enum đọc `<name>_MoTa`, Date theo giờ địa
 * phương (kèm giờ khi showTime), còn lại như bộ dựng DataClass.
 */
export const formatWorkflowValue = (
  item: Record<string, any>,
  field: WorkflowField,
): React.ReactNode => {
  if (!item || !field) return "---";

  if (field.typeProperty === TypeProperty.Enum) {
    const text = readItemValue(item, `${field.name}_MoTa`);
    if (text != null && text !== "") return String(text);

    const raw = readItemValue(item, field.name);
    return raw == null || raw === "" ? "---" : String(raw);
  }

  if (field.typeProperty === TypeProperty.Date) {
    return formatBeDate(readItemValue(item, field.name), !!field.showTime) || "---";
  }

  return getFieldValue(item, field);
};

/** Dòng dữ liệu → giá trị ban đầu của form (cùng luật màn Sửa tài sản). */
export const buildInitialFormData = (
  fields: WorkflowField[],
  item: Record<string, any> | null | undefined,
) => {
  const initial: Record<string, any> = {};

  fields.forEach((field) => {
    const raw = readItemValue(item, field.name);

    switch (field.typeProperty) {
      case TypeProperty.Date:
        initial[field.name] = raw ? normalizeDateFromBE(raw) : "";
        break;
      case TypeProperty.Bool:
        initial[field.name] = isOn(raw);
        break;
      case TypeProperty.Enum:
      case TypeProperty.Reference:
        initial[field.name] = raw ?? "";
        initial[`${field.name}_MoTa`] =
          readItemValue(item, `${field.name}_MoTa`) ?? "";
        break;
      default:
        initial[field.name] = raw ?? "";
    }
  });

  return initial;
};

/**
 * Giá trị form → giá trị gửi lên, theo tên field của metadata. Chuỗi rỗng là
 * null; Date về "yyyy-MM-ddT00:00:00"; số về Number.
 */
export const buildDynamicPayload = (
  fields: WorkflowField[],
  formData: Record<string, any>,
) => {
  const payload: Record<string, any> = {};

  fields.forEach((field) => {
    const value = formData[field.name];
    const isEmpty = value === "" || value === null || value === undefined;

    switch (field.typeProperty) {
      case TypeProperty.Date:
        payload[field.name] = isEmpty ? null : formatDateForBE(value);
        break;
      case TypeProperty.Int:
      case TypeProperty.Decimal:
      case TypeProperty.Reference:
      case TypeProperty.Enum: {
        const num = Number(value);
        payload[field.name] = isEmpty || !Number.isFinite(num) ? null : num;
        break;
      }
      case TypeProperty.Bool:
        payload[field.name] = !!value;
        break;
      default:
        payload[field.name] = isEmpty ? null : value;
    }
  });

  return payload;
};
