import axios from "axios";
import { Conditions, Field } from "../../types";
import { getValidToken } from "../../context/AuthContext";
import { API_ENDPOINTS, BASE_URL } from "../../config";
import { Buffer } from "buffer";

export const getList = async (
  nameCLass: string,
  orderby: string,
  pageSize: number,
  skipSize: number,
  searchText: string,
  fields: Field[],
  conditions: Conditions[],
  conditionsAll: Conditions[]
) => {
  try {
    const token = await getValidToken();
    if (!token) {
      throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
    }

    const config = {
      method: "POST" as const,
      url: `${BASE_URL}/${nameCLass}/get-list`,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: `Bearer ${token}`,
      },
      data: {
        orderby,
        pageSize,
        skipSize,
        searchText,
        fields,
        conditions,
        conditionsAll,
      },
    };
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (__DEV__) console.error(`GetList ${nameCLass} API error:`, error);
    throw error;
  }
};

export const getFieldActive = async (iD_Class_MoTa: string) => {
  try {
    const token = await getValidToken();
    if (!token) {
      throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
    }

    const config = {
      method: "POST" as const,
      url: API_ENDPOINTS.GET_FIELD_ACTIVE,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: `Bearer ${token}`,
      },
      data: {
        iD_Class_MoTa,
      },
    };
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (__DEV__) console.error("GetList May Tinh API error:", error);
    throw error;
  }
};

export const getPropertyClass = async (nameClass: string) => {
  try {
    const token = await getValidToken();

    if (!token) {
      throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
    }

    const config = {
      method: "POST" as const,
      url: API_ENDPOINTS.GET_CLASS_BY_NAME,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: `Bearer ${token}`,
      },
      data: {
        nameClass,
      },
    };
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (__DEV__) console.error("GetList May Tinh API error:", error);
    throw error;
  }
};

export const getDetails = async (nameCLass: string, id: number) => {
  try {
    const token = await getValidToken();

    if (!token) {
      throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
    }

    const config = {
      method: "POST" as const,
      url: `${BASE_URL}/${nameCLass}/get-details`,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: `Bearer ${token}`,
      },
      data: {
        id,
      },
    };
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (__DEV__) console.error(`Get Details ${nameCLass} API error:`, error);
    throw error;
  }
};

export const getDetailsHistory = async (nameCLass: string, id: number) => {
  try {
    const token = await getValidToken();

    if (!token) {
      throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
    }

    const config = {
      method: "POST" as const,
      url: `${BASE_URL}/${nameCLass}/get-list-history-detail`,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: `Bearer ${token}`,
      },
      data: {
        log_ID: id,
      },
    };
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (__DEV__)
      console.error(`Get Details History ${nameCLass} API error:`, error);
    throw error;
  }
};

export const getClassReference = async (nameCLass: string) => {
  try {
    const token = await getValidToken();

    if (!token) {
      throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
    }

    const config = {
      method: "POST" as const,
      url: API_ENDPOINTS.GET_CLASS_REFERENCE,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: `Bearer ${token}`,
      },
      data: {
        referenceName: nameCLass,
      },
    };
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (__DEV__) console.error(`Get Details ${nameCLass} API error:`, error);
    throw error;
  }
};

export const getListHistory = async (id: number, nameCLass: string) => {
  try {
    const token = await getValidToken();

    if (!token) {
      throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
    }

    const config = {
      method: "POST" as const,
      url: `${BASE_URL}/${nameCLass}/get-list-history`,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: `Bearer ${token}`,
      },
      data: {
        id,
      },
    };
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (__DEV__) console.error(`Get ListHistory ${id} API error:`, error);
    throw error;
  }
};

export const getListAttachFile = async (
  nameCLass: string,
  orderby: string,
  pageSize: number,
  skipSize: number,
  searchText: string,
  conditions: Conditions[],
  conditionsAll: Conditions[]
) => {
  try {
    const token = await getValidToken();
    if (!token) {
      throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
    }

    const config = {
      method: "POST" as const,
      url: `${BASE_URL}/${nameCLass}/get-attach-file`,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: `Bearer ${token}`,
      },
      data: {
        orderby,
        pageSize,
        skipSize,
        searchText,
        conditions,
        conditionsAll,
      },
    };
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (__DEV__)
      console.error(`GetList Attach File ${nameCLass} API error:`, error);
    throw error;
  }
};

export const getPreviewAttachFile = async (
  name: string,
  path: string,
  nameClass: string
) => {
  try {
    const token = await getValidToken();
    if (!token) throw new Error("Không tìm thấy token.");

    const response = await axios.post(
      `${BASE_URL}/${nameClass}/preview-attach-file`,
      { name, path, isMobile: true },
      {
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          Authorization: `Bearer ${token}`,
        },
        responseType: "arraybuffer",
        timeout: 10000,
      }
    );

    const base64Data = Buffer.from(response.data, "binary").toString("base64");

    return {
      headers: response.headers,
      data: base64Data,
    };
  } catch (error: any) {
    if (__DEV__) {
      console.error(`GetPreview Attach File ${nameClass} API error:`, error);
    }
    // Bổ sung message rõ hơn
    const message =
      error.response?.data?.message || error.message || "Lỗi không xác định";
    throw new Error(message);
  }
};
