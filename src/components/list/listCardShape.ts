import type { Field } from "../../types";
import { TypeProperty } from "../../utils/Enum";

/** Field ảnh / QR — `ListCardAsset` gom sang cột phải thay vì một dòng chữ. */
export const isMediaField = (field: Field) =>
  field.typeProperty === TypeProperty.Image ||
  field.typeProperty === TypeProperty.ImageBase64;

/** Số dòng chữ và số ô ảnh / QR của thẻ `ListCardAsset`, để khung chờ vẽ theo. */
export type ListCardShape = {
  lines?: number;
  media?: number;
  /** `ListCardAsset` không đặt `alignItems`: avatar luôn nằm ở đỉnh thẻ. */
  avatarAlign: "top";
};

/* Dáng thẻ đã biết của từng class trong phiên: mở lại danh sách thì khung chờ
   vẽ đúng ngay từ đầu, khỏi phải chờ `getFieldActive` như lần mở đầu. */
const shapeByClass = new Map<string, ListCardShape>();
const DEFAULT_SHAPE: ListCardShape = { avatarAlign: "top" };

/**
 * Dáng thẻ của danh sách `nameClass`, từ chính các field thẻ sẽ hiện.
 *
 * Chưa có field (lần đầu mở, đang chờ `getFieldActive`) thì lấy dáng đã nhớ;
 * chưa nhớ thì chỉ trả cách căn avatar, khung chờ dùng số dòng mặc định
 * (avatar + 3 dòng).
 */
export const getListCardShape = (
  nameClass: string | undefined,
  fields: Field[],
): ListCardShape => {
  if (fields.length === 0) {
    return (nameClass && shapeByClass.get(nameClass)) || DEFAULT_SHAPE;
  }

  const media = fields.filter(isMediaField).length;
  const shape: ListCardShape = {
    lines: fields.length - media,
    media,
    avatarAlign: "top",
  };
  if (nameClass) shapeByClass.set(nameClass, shape);
  return shape;
};
