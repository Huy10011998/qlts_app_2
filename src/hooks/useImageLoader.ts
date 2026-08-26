import { useEffect, useRef } from "react";
import { TypeProperty } from "../utils/Enum";
import type { PreviewImgByTypeProps } from "../types/components.d";
import { hasLocalPreview } from "../utils/Image";

export const useImageLoader = ({
  fieldActive,
  formData,
  fetchImage,
  setImages,
  setLoadingImages,
}: PreviewImgByTypeProps) => {
  const prevImageValues = useRef<Record<string, any>>({});

  useEffect(() => {
    fieldActive.forEach(
      (f: { typeProperty: TypeProperty; name: string | number }) => {
        if (f.typeProperty === TypeProperty.Image) {
          const newVal = formData[f.name];
          const oldVal = prevImageValues.current[f.name];

          // Nếu giá trị là rỗng hoặc "---" => KHÔNG fetch ảnh
          if (!newVal || newVal === "---" || newVal === "") {
            setImages((p: any) => ({ ...p, [f.name]: "" }));
            setLoadingImages((p: any) => ({ ...p, [f.name]: false }));

            prevImageValues.current[f.name] = newVal;
            return;
          }

          // Ảnh đang hiện bằng file trên máy thì đã đúng ảnh đó rồi, tải lại chỉ
          // làm nhấp nháy thêm một nhịp.
          if (hasLocalPreview(String(f.name), String(newVal))) {
            prevImageValues.current[f.name] = newVal;
            return;
          }

          // Chỉ fetch khi giá trị thay đổi và hợp lệ
          if (newVal !== oldVal) {
            fetchImage(f.name as string, newVal, setLoadingImages, setImages);
          }

          prevImageValues.current[f.name] = newVal;
        }
      },
    );
  }, [fetchImage, fieldActive, formData, setImages, setLoadingImages]);
};
