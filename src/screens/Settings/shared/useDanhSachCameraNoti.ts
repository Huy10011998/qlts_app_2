import { useCallback, useEffect, useRef, useState } from "react";
import { getVungCamera } from "../../../services/data/cameraApi";
import { removeVietnameseTones } from "../../../utils/helpers/string";
import { warn } from "../../../utils/Logger";

/** Một camera đủ để tạo lệnh tạm dừng riêng (BE chỉ cần `ID_Camera`). */
export type CameraNotiChon = {
  id: number;
  ma: string;
  ten: string;
  vung: string;
};

/**
 * Danh sách camera cho ô chọn phạm vi ở màn "Thông báo camera".
 *
 * Dùng chung API `get-vung-camera-steam` với màn Camera: BE không có API riêng
 * trả danh sách phẳng, và mỗi dòng trong đó đã kèm sẵn `iD_Camera`. Một camera
 * có thể xuất hiện nhiều dòng nên phải lọc trùng theo `iD_Camera`.
 */
export const mapCameraRows = (rows: unknown): CameraNotiChon[] => {
  if (!Array.isArray(rows)) return [];

  const theoId = new Map<number, CameraNotiChon>();

  rows.forEach((row: any) => {
    const id = Number(row?.iD_Camera);
    const ma = String(row?.iD_Camera_Ma ?? "").trim();

    // Dòng chỉ mô tả vùng (không gắn camera) cũng nằm chung mảng này.
    if (!Number.isFinite(id) || id <= 0 || !ma || theoId.has(id)) return;

    theoId.set(id, {
      id,
      ma,
      ten: String(row?.iD_Camera_MoTa ?? "").trim() || ma,
      vung: String(row?.iD_VungCamera_MoTa ?? "").trim(),
    });
  });

  return Array.from(theoId.values()).sort((a, b) =>
    a.ten.localeCompare(b.ten, "vi"),
  );
};

/** Lọc theo mã, tên hoặc vùng — bỏ dấu để gõ không dấu vẫn ra. */
export const locCamera = (
  danhSach: CameraNotiChon[],
  tuKhoa: string,
): CameraNotiChon[] => {
  const keyword = removeVietnameseTones(tuKhoa.trim());
  if (!keyword) return danhSach;

  return danhSach.filter((camera) =>
    removeVietnameseTones(`${camera.ma} ${camera.ten} ${camera.vung}`).includes(
      keyword,
    ),
  );
};

/**
 * Tải danh sách camera một lần, chỉ khi người dùng thực sự mở ô chọn — phần lớn
 * lượt vào màn hình chỉ tạm dừng toàn bộ, không cần gọi API này.
 */
export function useDanhSachCameraNoti() {
  const [danhSach, setDanhSach] = useState<CameraNotiChon[]>([]);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const daTaiRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const tai = useCallback(async (buocTaiLai = false) => {
    if (daTaiRef.current && !buocTaiLai) return;

    daTaiRef.current = true;
    setDangTai(true);
    setLoi(null);

    try {
      const res: any = await getVungCamera();
      const cameras = mapCameraRows(res?.data);

      if (!isMountedRef.current) return;

      setDanhSach(cameras);
      setDangTai(false);
    } catch (err) {
      warn("[NotiCamera] Tải danh sách camera thất bại", err);

      // Cho phép thử lại: lần gọi sau không bị chặn bởi cờ đã tải.
      daTaiRef.current = false;

      if (!isMountedRef.current) return;

      setDangTai(false);
      setLoi("Không tải được danh sách camera. Kéo xuống hoặc thử lại.");
    }
  }, []);

  return { danhSach, dangTai, loi, tai };
}
