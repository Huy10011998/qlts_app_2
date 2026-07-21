import { Buffer } from "buffer";
import { api, callApi } from "./httpClient";
import { API_ENDPOINTS } from "../../config/index";
import { log } from "../../utils/Logger";

export const getPreviewBC = async (
  param: Record<string, any>,
  path: string,
  timeout = 30000,
) => {
  const res = await api.post(path, param, {
    responseType: "arraybuffer",
    timeout,
  });
  return {
    headers: res.headers,
    data: Buffer.from(res.data, "binary").toString("base64"),
  };
};

export const getConfigReport = async <T = any,>(nameReport: string) => {
  log("[API] getConfigReport request", {
    endpoint: API_ENDPOINTS.GET_CONFIG_REPORT,
    nameReport,
  });

  return callApi<T>("POST", API_ENDPOINTS.GET_CONFIG_REPORT, { nameReport });
};
