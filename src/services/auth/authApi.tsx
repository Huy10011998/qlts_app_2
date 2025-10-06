import { API_ENDPOINTS } from "../../config/Index";
import { ChangePasswordResponse, LoginResponse } from "../../types/Api.d";
import { callApi, md5Hash } from "../../utils/Helper";

export const loginApi = async (
  userName: string,
  userPassword: string
): Promise<LoginResponse> => {
  const hashedPassword = await md5Hash(userPassword);

  const response = await callApi<LoginResponse>("POST", API_ENDPOINTS.LOGIN, {
    userName,
    userPassword: hashedPassword,
  });

  return response;
};

export const changePasswordApi = async (
  oldPassword: string,
  newPassword: string
): Promise<ChangePasswordResponse> => {
  try {
    const hashedPassword = await md5Hash(oldPassword);
    const hashedNewPassword = await md5Hash(newPassword);

    return await callApi<ChangePasswordResponse>(
      "POST",
      API_ENDPOINTS.CHANGE_PASSWORD,
      {
        oldPassword: hashedPassword,
        newPassword: hashedNewPassword,
      }
    );
  } catch (error: any) {
    if (__DEV__) console.error("ChangePassword API error:", error);
    throw error;
  }
};
