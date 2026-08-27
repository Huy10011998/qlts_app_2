import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  CameraNotiLenh,
  CameraNotiPhamVi,
  getTrangThaiNotiCamera,
  huyTamDungNotiCamera,
  tamDungNotiCamera,
} from "../../../services/notifications/cameraNotiApi";
import { warn } from "../../../utils/Logger";

/** HTTP 403 = tài khoản chưa có quyền Class.Camera.NotiCameraMobile. */
const isForbidden = (err: unknown) =>
  (err as { response?: { status?: number } })?.response?.status === 403;

/** Lệnh còn hiệu lực lâu nhất — cái quyết định lúc nào user nhận noti trở lại. */
const pickLenhChinh = (danhSach: CameraNotiLenh[]): CameraNotiLenh | null =>
  danhSach.reduce<CameraNotiLenh | null>(
    (longest, item) =>
      !longest || item.soPhutConLai > longest.soPhutConLai ? item : longest,
    null,
  );

export type CameraNotiState = {
  /** null khi chưa gọi xong lần đầu. */
  danhSach: CameraNotiLenh[] | null;
  lenhChinh: CameraNotiLenh | null;
  dangTamDung: boolean;
  /** true khi BE trả 403 — màn hình chỉ hiện thông báo thiếu quyền. */
  thieuQuyen: boolean;
  dangTai: boolean;
  dangGui: boolean;
  loi: string | null;
};

/**
 * Trạng thái tạm dừng thông báo camera.
 *
 * Tải lại mỗi lần màn hình được focus và mỗi lần app quay lại foreground —
 * lệnh toàn cục có thể do người khác tạo/huỷ trong lúc app nằm nền.
 */
export function useCameraNotiTamDung() {
  const [state, setState] = useState<CameraNotiState>({
    danhSach: null,
    lenhChinh: null,
    dangTamDung: false,
    thieuQuyen: false,
    dangTai: true,
    dangGui: false,
    loi: null,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const taiTrangThai = useCallback(async () => {
    setState((prev) => ({ ...prev, dangTai: true, loi: null }));

    try {
      const res = await getTrangThaiNotiCamera();
      const danhSach = Array.isArray(res?.data) ? res.data : [];

      if (!isMountedRef.current) return;

      setState((prev) => ({
        ...prev,
        danhSach,
        lenhChinh: pickLenhChinh(danhSach),
        dangTamDung: danhSach.length > 0,
        thieuQuyen: false,
        dangTai: false,
      }));
    } catch (err) {
      warn("[NotiCamera] Đọc trạng thái tạm dừng thất bại", err);

      if (!isMountedRef.current) return;

      setState((prev) => ({
        ...prev,
        dangTai: false,
        thieuQuyen: isForbidden(err),
        loi: isForbidden(err)
          ? null
          : "Không đọc được trạng thái thông báo. Kiểm tra kết nối rồi thử lại.",
      }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      taiTrangThai();
    }, [taiTrangThai]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") taiTrangThai();
    });

    return () => subscription.remove();
  }, [taiTrangThai]);

  const tamDung = useCallback(
    async (input: {
      soPhut: number;
      phamVi: CameraNotiPhamVi;
      idCamera?: number | null;
      lyDo?: string;
    }) => {
      setState((prev) => ({ ...prev, dangGui: true, loi: null }));

      try {
        await tamDungNotiCamera(input);
        await taiTrangThai();
        return true;
      } catch (err) {
        warn("[NotiCamera] Tạo lệnh tạm dừng thất bại", err);

        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            thieuQuyen: isForbidden(err),
            loi: isForbidden(err)
              ? null
              : "Không tạm dừng được thông báo. Thử lại sau ít phút.",
          }));
        }

        return false;
      } finally {
        if (isMountedRef.current) {
          setState((prev) => ({ ...prev, dangGui: false }));
        }
      }
    },
    [taiTrangThai],
  );

  /**
   * @param id bỏ trống = huỷ mọi lệnh do chính mình tạo. Muốn huỷ lệnh toàn cục
   * của người khác thì phải truyền đúng ID của lệnh đó.
   */
  const huyTamDung = useCallback(
    async (id?: number | null) => {
      setState((prev) => ({ ...prev, dangGui: true, loi: null }));

      try {
        // data = 0 (không có gì để huỷ) không phải lỗi — chỉ cần đồng bộ lại.
        await huyTamDungNotiCamera(id);
        await taiTrangThai();
        return true;
      } catch (err) {
        warn("[NotiCamera] Huỷ lệnh tạm dừng thất bại", err);

        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            thieuQuyen: isForbidden(err),
            loi: isForbidden(err)
              ? null
              : "Không bật lại được thông báo. Thử lại sau ít phút.",
          }));
        }

        return false;
      } finally {
        if (isMountedRef.current) {
          setState((prev) => ({ ...prev, dangGui: false }));
        }
      }
    },
    [taiTrangThai],
  );

  return { ...state, taiTrangThai, tamDung, huyTamDung };
}
