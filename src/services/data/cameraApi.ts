import { callApi } from "./httpClient";
import { API_ENDPOINTS } from "../../config/index";

export const getVungCamera = async <T = any,>() =>
  callApi<T>("POST", API_ENDPOINTS.GET_VUNG_CAMERA_STEAM);

export const getTokenViewCamera = async <T = any,>() =>
  callApi<T>("POST", API_ENDPOINTS.GET_TOKEN_VIEW_CAMERA);
