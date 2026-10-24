import { useCallback, useEffect, useRef, useState } from "react";

import { joinTraoDoiRoom, sendDangNhap } from "../../../services/realtime/traoDoiHub";
import type { WorkflowComment } from "../../../types/index";
import {
  applyDangNhap,
  DANG_NHAP_KEEPALIVE_MS,
  DangNhapEntry,
  formatDangNhapLabel,
  pruneDangNhap,
  removeDangNhap,
} from "./realtimeCommentRules";

type Options = {
  /** Name của màn phiếu (vd "Ticket_PhongBan") hoặc "CV_CongViec". */
  tenBang: string;
  idHoSo: number;
  myId: number | null | undefined;
  onBinhLuanMoi: (comment: WorkflowComment) => void;
  onBinhLuanThuHoi: (idBinhLuan: number) => void;
  /** Nối lại sau khi rớt mạng — có thể đã lỡ bình luận. */
  onReconnected: () => void;
};

const PRUNE_EVERY_MS = 5_000;

/**
 * Realtime cho 1 khung bình luận: vào phòng khi mở, rời khi thoát; nhận bình
 * luận mới + "đang nhập" của người khác; báo "đang nhập" của mình theo focus
 * ô nhập (nhắc lại mỗi 15 giây). Hub lỗi thì mọi thứ im lặng như không realtime.
 */
export const useRealtimeComments = ({
  tenBang,
  idHoSo,
  myId,
  onBinhLuanMoi,
  onBinhLuanThuHoi,
  onReconnected,
}: Options) => {
  const [dangNhaps, setDangNhaps] = useState<DangNhapEntry[]>([]);
  const handlersRef = useRef({ onBinhLuanMoi, onBinhLuanThuHoi, onReconnected, myId });
  handlersRef.current = { onBinhLuanMoi, onBinhLuanThuHoi, onReconnected, myId };
  const focusedRef = useRef(false);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const leave = joinTraoDoiRoom(tenBang, idHoSo, {
      onBinhLuanMoi: (comment) => {
        handlersRef.current.onBinhLuanMoi(comment);
        // Người đó vừa gửi xong → thôi "đang nhập".
        setDangNhaps((list) => removeDangNhap(list, comment.iD_NhanVien));
      },
      onBinhLuanThuHoi: (idBinhLuan) => handlersRef.current.onBinhLuanThuHoi(idBinhLuan),
      onDangNhap: (event) =>
        setDangNhaps((list) => applyDangNhap(list, event, handlersRef.current.myId, Date.now())),
      onReconnected: () => {
        setDangNhaps([]);
        handlersRef.current.onReconnected();
        if (focusedRef.current) sendDangNhap(tenBang, idHoSo, true);
      },
    });

    return () => {
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
      if (focusedRef.current) sendDangNhap(tenBang, idHoSo, false);
      focusedRef.current = false;
      leave();
    };
  }, [idHoSo, tenBang]);

  // Bỏ người quá 40 giây không nghe nhắc lại — chỉ chạy khi đang có người.
  const hasDangNhap = dangNhaps.length > 0;
  useEffect(() => {
    if (!hasDangNhap) return;
    const timer = setInterval(
      () => setDangNhaps((list) => pruneDangNhap(list, Date.now())),
      PRUNE_EVERY_MS,
    );
    return () => clearInterval(timer);
  }, [hasDangNhap]);

  const setComposerFocused = useCallback(
    (focused: boolean) => {
      if (focusedRef.current === focused) return;
      focusedRef.current = focused;
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;

      sendDangNhap(tenBang, idHoSo, focused);
      if (focused) {
        keepAliveRef.current = setInterval(
          () => sendDangNhap(tenBang, idHoSo, true),
          DANG_NHAP_KEEPALIVE_MS,
        );
      }
    },
    [idHoSo, tenBang],
  );

  return { dangNhapLabel: formatDangNhapLabel(dangNhaps), setComposerFocused };
};
