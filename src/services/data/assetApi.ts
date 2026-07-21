import { Buffer } from "buffer";
import { api, callApi } from "./httpClient";
import type { ApiResponse } from "../../types";

export const getList = async <T = any,>(
  nameClass: string,
  orderby: string,
  pageSize: number,
  skipSize: number,
  searchText: string,
  conditions: any[],
  conditionsAll: any[],
) =>
  callApi<T>("POST", `/${nameClass}/get-list`, {
    orderby,
    pageSize,
    skipSize,
    searchText,
    conditions,
    conditionsAll,
  });

export const getBuildTree = async <T = any,>(nameClass: string) =>
  callApi<T>("POST", `/${nameClass}/build-tree`, {});

export const getDetails = async <T = any,>(nameClass: string, id: string) =>
  callApi<T>("POST", `/${nameClass}/get-details`, { id });

export const getDetailsQr = async <T = any,>(nameClass: string, qr: string) =>
  callApi<T>("POST", `/${nameClass}/get-details`, { id: 0, qr });

export const getDetailsHistory = async <T = any,>(
  nameClass: string,
  id: string,
) =>
  callApi<T>("POST", `/${nameClass}/get-list-history-detail`, { log_ID: id });

export const getListHistory = async <T = any,>(id: string, nameClass: string) =>
  callApi<T>("POST", `/${nameClass}/get-list-history`, { id });

export const getListAttachFile = async (
  nameClass: string,
  orderby: string,
  pageSize: number,
  skipSize: number,
  searchText: string,
  conditions: any[],
  conditionsAll: any[],
) =>
  callApi<ApiResponse<{ items: Record<string, any>[]; totalCount: number }>>(
    "POST",
    `/${nameClass}/get-attach-file`,
    { orderby, pageSize, skipSize, searchText, conditions, conditionsAll },
  );

export const getPreviewAttachFile = async (
  name: string,
  path: string,
  nameClass: string,
) => {
  const res = await api.post(
    `/${nameClass}/preview-attach-file`,
    { name, path, isMobile: true },
    { responseType: "arraybuffer", timeout: 10000 },
  );
  return {
    headers: res.headers,
    data: Buffer.from(res.data, "binary").toString("base64"),
  };
};

export const insert = async <T = any,>(nameClass: string, payload: any) =>
  callApi<T>("POST", `/${nameClass}/insert`, payload);

export const update = async <T = any,>(nameClass: string, payload: any) =>
  callApi<T>("POST", `/${nameClass}/update`, payload);

export const deleteItems = async <T = any,>(
  nameClass: string,
  body: { iDs: number[]; saveHistory: boolean },
) => callApi<T>("POST", `/${nameClass}/delete`, body);

export const checkReferenceUsage = async <T = any,>(
  nameClass: string,
  iDs: number[],
) => callApi<T>("POST", `/${nameClass}/check-reference-usage`, { iDs });

export const tuDongTang = async <T = any,>(nameClass: string, payload: {}) =>
  callApi<T>("POST", `/${nameClass}/tu-dong-tang`, payload);

export const getParentValue = async <T = any,>(
  nameClass: string,
  payload: {},
) => callApi<T>("POST", `/${nameClass}/parent-value`, payload);

export const checkValidation = async <T = any,>(
  nameClass: string,
  payload: {
    data: Record<string, any>;
    id: number;
  },
) => {
  const response = await callApi<T>(
    "POST",
    `/${nameClass}/check-validation`,
    payload,
  );

  const validationItems =
    response &&
    typeof response === "object" &&
    "data" in (response as any) &&
    Array.isArray((response as any).data)
      ? (response as any).data
      : [];

  if (validationItems.length > 0) {
    const validationError: any = new Error("VALIDATION_ERROR");
    validationError.response = { data: response };
    throw validationError;
  }

  return response;
};
