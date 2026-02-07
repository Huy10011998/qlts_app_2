import { useEffect, useRef } from "react";
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
  rawTreeValues,
  parentValue,
  setFormData,
}: Props) {
  const requestIdRef = useRef(0); // chống race

  const fieldName = propertyClass?.propertyTuDongTang;

  const fetchAutoCode = async (parent?: any) => {
    if (!propertyClass?.isTuDongTang || !nameClass || !fieldName) return;

    const requestId = ++requestIdRef.current;

    const res = await tuDongTang(nameClass, {
      propertyTuDongTang: fieldName,
      formatTuDongTang: propertyClass.formatTuDongTang,
      prentTuDongTang: propertyClass.prentTuDongTang,
      prentTuDongTang_Value: parent === undefined ? "" : String(parent),
      prefix: propertyClass.prefix,
    });

    // nếu không phải request mới nhất → bỏ
    if (requestId !== requestIdRef.current) return;

    if (!res?.data) return;

    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: res.data,
    }));
  };

  /* INIT */
  useEffect(() => {
    const parentProps = propertyClass?.prentTuDongTang?.split(",") || [];

    const validParentValues = parentProps
      .map((_: any, idx: number) => Number(rawTreeValues[idx]))
      .filter((v: number) => !isNaN(v) && v >= 0)
      .join(",");

    fetchAutoCode(validParentValues);
  }, [rawTreeValues]);

  /* PARENT CHANGE */
  useEffect(() => {
    if (parentValue === undefined) return;

    fetchAutoCode(parentValue);
  }, [parentValue]);
}
