import { useEffect, useState } from "react";

import { API_ENDPOINTS } from "../../../config/index";
import { readStoredAuthUsername } from "../../../context/authStorage";
import { callApi } from "../../../services/data/callApi";
import type { UserInfo } from "../../../types";
import { error } from "../../../utils/Logger";

/**
 * Tên tài khoản đang đăng nhập, để nung vào watermark ảnh xác nhận.
 *
 * Username đọc từ máy nên có ngay cả khi mất mạng — hiện trước để dải watermark
 * không bao giờ trống. Gọi `get-info` chỉ để nâng cấp thành họ tên đầy đủ; lỗi
 * mạng thì giữ nguyên username chứ không chặn luồng chụp.
 */
export const useWatermarkAccountName = () => {
  const [accountName, setAccountName] = useState("");

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      const storedUserName = (await readStoredAuthUsername())?.trim() || "";

      if (!isActive) return;
      if (storedUserName) setAccountName(storedUserName);

      try {
        const response = await callApi<{ success: boolean; data: UserInfo }>(
          "POST",
          API_ENDPOINTS.GET_INFO,
          {},
        );
        const fullName = response?.data?.moTa?.trim();

        if (!isActive || !fullName) return;

        setAccountName(
          storedUserName ? `${fullName} (${storedUserName})` : fullName,
        );
      } catch (e) {
        error("[NoiDia] Không lấy được tên tài khoản cho watermark", e);
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, []);

  return accountName;
};
