import { useCallback, useRef, useState } from "react";

import { usePermission } from "../../../hooks/usePermission";
import { useSafeAlert } from "../../../hooks/useSafeAlert";
import {
  CAP_NHAT_TOA_DO_ACTION,
  capNhatToaDoKhachHang,
  getNoiDiaErrorMessage,
  KHACH_HANG_NAME_CLASS,
  type KhachHangToaDoItem,
} from "../../../services/data/callApi";
import { openAppPermissionSettings } from "../../../services/cameraPermission";
import {
  getCurrentCoordinates,
  type Coordinates,
} from "../../../utils/location/currentPosition";
import { isNetworkRequestError } from "../../../utils/helpers/api";
import { error } from "../../../utils/Logger";
import { ACCURACY_LIMIT_M, getToaDoRejectReason } from "./khachHangLookup";

/** Khách hàng cần ghi mốc toạ độ — chỉ cần id để gửi và nhãn để hỏi lại user. */
export type CapNhatToaDoTarget = {
  id: number;
  /** "Mã - Tên" hoặc tên khách hàng, hiện trong câu xác nhận. */
  label: string;
};

export type CapNhatToaDoStatus = "idle" | "locating" | "submitting";

const FALLBACK_ERROR = "Cập nhật toạ độ khách hàng thất bại";

export const useCapNhatToaDoKhachHang = ({
  onSuccess,
}: {
  onSuccess?: (saved: KhachHangToaDoItem) => void;
} = {}) => {
  const { can } = usePermission();
  const { isMounted, showAlertIfActive } = useSafeAlert();
  const [status, setStatus] = useState<CapNhatToaDoStatus>("idle");

  // Đúng quyền server yêu cầu: Class.NoiDia_KhachHang.CapNhatToaDo — action
  // riêng, không phải Update chung của record khách hàng. Kiểm ở đây (chỗ duy
  // nhất) rồi màn gọi ẩn hẳn thao tác, thay vì để user bấm rồi ăn 403.
  const canUpdate = can(KHACH_HANG_NAME_CLASS, CAP_NHAT_TOA_DO_ACTION);

  const submit = useCallback(
    async (target: CapNhatToaDoTarget, coordinates: Coordinates) => {
      setStatus("submitting");

      try {
        const response = await capNhatToaDoKhachHang({
          idKhachHang: target.id,
          lat: coordinates.lat,
          lng: coordinates.lng,
        });

        const saved = response.data;
        if (!saved) {
          showAlertIfActive(
            "Không cập nhật được",
            response.message?.trim() || FALLBACK_ERROR,
          );
          return;
        }

        onSuccess?.(saved);

        // Lấy lat/lng từ response: server chuẩn hoá về dấu chấm, có thể khác
        // chuỗi app gửi lên.
        showAlertIfActive(
          "Thành công",
          `Đã cập nhật toạ độ khách hàng ${target.label}.\n\nToạ độ đã lưu: ${
            saved.lat ?? coordinates.lat
          }, ${saved.lng ?? coordinates.lng}`,
        );
      } catch (e) {
        error("[NoiDia] Cập nhật toạ độ khách hàng thất bại", e);
        showAlertIfActive(
          "Lỗi",
          isNetworkRequestError(e)
            ? "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại."
            : getNoiDiaErrorMessage(e, FALLBACK_ERROR),
        );
      } finally {
        if (isMounted()) setStatus("idle");
      }
    },
    [isMounted, onSuccess, showAlertIfActive],
  );

  // Nút "Thử lại" trong alert phải gọi lại chính luồng này, nên giữ qua ref.
  const startRef = useRef<(target: CapNhatToaDoTarget) => void>(() => {});

  const start = useCallback(
    async (target: CapNhatToaDoTarget) => {
      if (!canUpdate || !target.id || status !== "idle") return;

      setStatus("locating");

      // maximumAge 0: đây là ghi mốc toạ độ, không được tái dùng fix cũ lấy ở
      // chỗ khác.
      const coordinates = await getCurrentCoordinates({ maximumAge: 0 });

      if (!isMounted()) return;
      setStatus("idle");

      if (!coordinates) {
        showAlertIfActive(
          "Không lấy được toạ độ",
          "Kiểm tra quyền vị trí và GPS của thiết bị rồi thử lại.",
          [
            { text: "Để sau", style: "cancel" },
            { text: "Mở Cài đặt", onPress: () => openAppPermissionSettings() },
          ],
        );
        return;
      }

      const { accuracy } = coordinates;
      if (accuracy === undefined || accuracy > ACCURACY_LIMIT_M) {
        showAlertIfActive(
          "Độ chính xác chưa đạt",
          `${
            accuracy === undefined
              ? "Thiết bị không báo được độ chính xác GPS."
              : `Độ chính xác hiện tại ±${Math.round(accuracy)}m.`
          }\n\nCần ±${ACCURACY_LIMIT_M}m trở xuống mới được ghi mốc toạ độ. Ra khu vực thoáng rồi thử lại.`,
          [
            { text: "Đóng", style: "cancel" },
            { text: "Thử lại", onPress: () => startRef.current(target) },
          ],
        );
        return;
      }

      const rejectReason = getToaDoRejectReason(
        coordinates.lat,
        coordinates.lng,
      );
      if (rejectReason) {
        showAlertIfActive("Toạ độ không hợp lệ", rejectReason, [
          { text: "Đóng", style: "cancel" },
          { text: "Thử lại", onPress: () => startRef.current(target) },
        ]);
        return;
      }

      showAlertIfActive(
        "Cập nhật toạ độ",
        `Cập nhật toạ độ cho khách hàng ${target.label}?\n\nToạ độ mới: ${
          coordinates.lat
        }, ${coordinates.lng}\nĐộ chính xác: ±${Math.round(accuracy)}m`,
        [
          { text: "Huỷ", style: "cancel" },
          { text: "Cập nhật", onPress: () => submit(target, coordinates) },
        ],
      );
    },
    [canUpdate, isMounted, showAlertIfActive, status, submit],
  );

  startRef.current = start;

  /** Nhãn cho nút/mục menu đang chạy dở, `null` khi rảnh. */
  const busyLabel =
    status === "locating"
      ? "Đang lấy toạ độ..."
      : status === "submitting"
      ? "Đang cập nhật..."
      : null;

  return {
    canUpdate,
    status,
    isBusy: status !== "idle",
    busyLabel,
    start,
  };
};
