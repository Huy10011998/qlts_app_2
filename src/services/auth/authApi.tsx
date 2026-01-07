import axios from "axios";
import { API_ENDPOINTS, BASE_URL } from "../../config/Index";
import { ChangePasswordResponse, LoginResponse } from "../../types/Api.d";
import { md5Hash } from "../../utils/Helper";
import { error } from "../../utils/Logger";
import { callApi } from "../data/CallApi";

export const authApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json;charset=UTF-8",
  },
});

export const loginApi = async (
  userName: string,
  userPassword: string
): Promise<LoginResponse> => {
  try {
    const hashedPassword = await md5Hash(userPassword);

    const res = await authApi.post<LoginResponse>(API_ENDPOINTS.LOGIN, {
      userName,
      userPassword: hashedPassword,
    });

    return res.data;
  } catch (e) {
    error("[Auth] Login API error:", e);
    throw e;
  }
};

export const changePasswordApi = async (
  oldPassword: string,
  newPassword: string
): Promise<ChangePasswordResponse> => {
  try {
    const hashedOldPassword = await md5Hash(oldPassword);
    const hashedNewPassword = await md5Hash(newPassword);

    return await callApi<ChangePasswordResponse>(
      "POST",
      API_ENDPOINTS.CHANGE_PASSWORD,
      {
        oldPassword: hashedOldPassword,
        newPassword: hashedNewPassword,
      }
    );
  } catch (e) {
    error("[Auth] ChangePassword API error:", e);
    throw e;
  }
};
