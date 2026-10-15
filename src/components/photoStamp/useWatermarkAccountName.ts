import { useEffect, useState } from "react";

import { API_ENDPOINTS } from "../../config/index";
import { readStoredAuthUsername } from "../../context/authStorage";
import { callApi } from "../../services/data/callApi";
import type { UserInfo } from "../../types";
import { error } from "../../utils/Logger";

/** Họ tên đầy đủ đã lấy được — chỉ đổi khi đổi tài khoản, khỏi gọi lại mỗi lần chụp. */
let cachedFullName: { userName: string; fullName: string } | null = null;

/**
 * Tên tài khoản đang đăng nhập để nung vào watermark: họ tên đầy đủ từ
 * `get-info`, lỗi mạng thì lùi về username lưu trên máy — không bao giờ ném lỗi
 * để chặn luồng chụp.
 */
export const loadWatermarkAccountName = async (): Promise<string> => {
  const storedUserName = (await readStoredAuthUsername())?.trim() || "";

  if (cachedFullName && cachedFullName.userName === storedUserName) {
    return cachedFullName.fullName;
  }

  try {
    const response = await callApi<{ success: boolean; data: UserInfo }>(
      "POST",
      API_ENDPOINTS.GET_INFO,
      {},
    );
    const fullName = response?.data?.moTa?.trim();

    if (fullName) {
      cachedFullName = { userName: storedUserName, fullName };
      return fullName;
    }
  } catch (e) {
    error("[Watermark] Không lấy được tên tài khoản", e);
  }

  return storedUserName;
};

/**
 * Tên tài khoản đang đăng nhập, để nung vào watermark ảnh xác nhận.
 *
 * Username đọc từ máy nên có ngay cả khi mất mạng — hiện trước để dải watermark
 * không bao giờ trống, rồi thay bằng họ tên đầy đủ khi tải xong.
 */
export const useWatermarkAccountName = () => {
  const [accountName, setAccountName] = useState("");

  useEffect(() => {
    let isActive = true;

    readStoredAuthUsername().then((userName) => {
      const trimmed = userName?.trim() || "";
      if (isActive && trimmed) setAccountName((current) => current || trimmed);
    });

    loadWatermarkAccountName().then((name) => {
      if (isActive && name) setAccountName(name);
    });

    return () => {
      isActive = false;
    };
  }, []);

  return accountName;
};
