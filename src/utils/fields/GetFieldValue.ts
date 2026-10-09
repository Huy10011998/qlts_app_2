import type { Field } from "../../types/model.d";
import { getMatchedKey } from "../Helper";
import { TypeProperty } from "../Enum";
import { isDataUrlImage } from "../imageBase64";

// Lấy giá trị từ Field
export const getFieldValue = (
  item: Record<string, any>,
  field: Field,
): React.ReactNode => {
  if (!item || !field) return "---";

  const key =
    field.typeProperty === TypeProperty.Reference
      ? `${field.name}_MoTa`
      : field.name;

  const matchedKey = getMatchedKey(item, key);
  const rawValue = matchedKey ? item[matchedKey] : undefined;
  if (rawValue == null) return "---";

  switch (field.typeProperty) {
    case TypeProperty.Date: {
      const date = new Date(rawValue);
      if (isNaN(date.getTime())) return "---";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`; // dd/MM/yyyy
    }

    case TypeProperty.Bool:
      return rawValue === true ? "✅" : rawValue === false ? "❌" : "---";

    case TypeProperty.Decimal: {
      const num = Number(rawValue);
      if (isNaN(num)) return "---";
      const formatter = new Intl.NumberFormat("vi-VN", {
        useGrouping: !field.notShowSplit,
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      });
      return formatter.format(num);
    }

    case TypeProperty.Int: {
      const num = Number(rawValue);
      if (isNaN(num)) return "--";
      const formatter = new Intl.NumberFormat("vi-VN", {
        useGrouping: !field.notShowSplit,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      return formatter.format(num);
    }

    case TypeProperty.Reference:
      return String(rawValue);

    case TypeProperty.Image: {
      const uri = String(rawValue);
      if (!uri) return "---";

      return uri;
    }

    /* Trả nguyên data URL để nơi gọi tự vẽ ảnh — đừng bao giờ in chuỗi này ra
       Text (vài chục KB). Không bắt đầu bằng `data:` là dữ liệu lỗi. */
    case TypeProperty.ImageBase64:
      return isDataUrlImage(rawValue) ? rawValue : "---";

    case TypeProperty.Link: {
      const link = String(rawValue);
      if (!link) return "---";

      return link;
    }

    default:
      return String(rawValue);
  }
};
