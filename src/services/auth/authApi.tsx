import { API_ENDPOINTS } from "../../config";
import { getValidToken } from "../../context/AuthContext";
import { ChangePasswordResponse, LoginResponse } from "../../types/api.d";
import { callApi, md5Hash } from "../../utils/helper";

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
    const token = await getValidToken(); // nhớ await token

    if (!token) {
      throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
    }

    const hashedPassword = await md5Hash(oldPassword);
    const hashedNewPassword = await md5Hash(newPassword);

    const response = await callApi("POST", API_ENDPOINTS.CHANGE_PASSWORD, {
      oldPassword: hashedPassword,
      newPassword: hashedNewPassword,
    });

    return response as ChangePasswordResponse;
  } catch (error: any) {
    if (__DEV__) console.error("ChangePassword API error:", error);
    throw error;
  }
};
