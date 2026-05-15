import { useCallback, useEffect, useRef } from "react";
import { tuDongTang } from "../../services/data/CallApi";

interface Props {
  nameClass?: string;
  propertyClass: any;
  formData: Record<string, any>;
  rawTreeValues: string[];
  parentValue?: any;
  setFormData: any;
}

export function useAutoIncrementCode({
  nameClass,
  propertyClass,
  formData,
  rawTreeValues,
  parentValue,
  setFormData,
}: Props) {
  const requestIdRef = useRef(0); // chống race
  const lastAutoValueRef = useRef<string | null>(null);
  const manualOverrideRef = useRef(false);

  const fieldName = propertyClass?.propertyTuDongTang;
  const currentFieldValue =
    fieldName && formData ? formData[fieldName] : undefined;

  useEffect(() => {
    if (!fieldName) return;

    const normalizedCurrentValue =
      currentFieldValue == null ? "" : String(currentFieldValue);
    const lastAutoValue = lastAutoValueRef.current;

    if (lastAutoValue == null) return;

    if (normalizedCurrentValue === lastAutoValue) {
      manualOverrideRef.current = false;
      return;
    }

    // Người dùng đã tự sửa/xóa mã sau khi hệ thống sinh ra
    manualOverrideRef.current = true;
  }, [currentFieldValue, fieldName]);

  const fetchAutoCode = useCallback(
    async (parent?: any) => {
      if (!propertyClass?.isTuDongTang || !nameClass || !fieldName) return;
      if (manualOverrideRef.current) return;

      const requestId = ++requestIdRef.current;

      const res = await tuDongTang(nameClass, {
        propertyTuDongTang: fieldName,
        formatTuDongTang: propertyClass.formatTuDongTang,
        prentTuDongTang: propertyClass.prentTuDongTang,
        prentTuDongTang_Value: parent === undefined ? "" : String(parent),
        prefix: propertyClass.prefix,
      });

      if (requestId !== requestIdRef.current) return;
      if (!res?.data) return;

      lastAutoValueRef.current = String(res.data);

      setFormData((prev: any) => ({
        ...prev,
        [fieldName]: res.data,
      }));
    },
    [
      fieldName,
      nameClass,
      propertyClass?.formatTuDongTang,
      propertyClass?.isTuDongTang,
      propertyClass?.prentTuDongTang,
      propertyClass?.prefix,
      setFormData,
    ],
  );

  /* INIT */
  useEffect(() => {
    const parentProps = propertyClass?.prentTuDongTang?.split(",") || [];

    const validParentValues = parentProps
      .map((_: any, idx: number) => Number(rawTreeValues[idx]))
      .filter((v: number) => !isNaN(v) && v >= 0)
      .join(",");

    fetchAutoCode(validParentValues);
  }, [fetchAutoCode, propertyClass?.prentTuDongTang, rawTreeValues]);

  /* PARENT CHANGE */
  useEffect(() => {
    if (parentValue === undefined) return;

    fetchAutoCode(parentValue);
  }, [fetchAutoCode, parentValue]);
}
