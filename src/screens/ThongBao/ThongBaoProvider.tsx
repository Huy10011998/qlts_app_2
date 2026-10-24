import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { navigationRef, pushScreensFromRef } from "../../navigation/navigationService";
import { thongBaoDaDoc, thongBaoGetList } from "../../services/data/thongBaoApi";
import {
  claimThongBaoToast,
  getPushSoChuaDoc,
  syncThongBaoBadge,
  subscribeThongBaoPush,
  thongBaoItemFromPush,
} from "../../services/notifications/thongBaoPush";
import { reconnectTraoDoiIfNeeded, subscribeThongBao } from "../../services/realtime/traoDoiHub";
import type { ThongBaoItem } from "../../types/index";
import { warn } from "../../utils/Logger";
import ThongBaoToast from "./ThongBaoToast";
import { getThongBaoScreens, resolveThongBaoTarget } from "./thongBaoRules";

type ThongBaoContextValue = {
  /** Số chưa đọc của mọi nhóm — số trên chuông. */
  soChuaDoc: number;
  setSoChuaDoc: (soChuaDoc: number) => void;
  /** Hỏi lại server (vd vừa nối lại, vừa quay lại app). */
  refreshSoChuaDoc: () => Promise<void>;
  /**
   * Bấm 1 thông báo (mục 2 + 4): đánh dấu đọc thông báo đó + mở đối tượng.
   * Danh sách đang hiện tự đổi dòng đó sang đã đọc.
   */
  openThongBao: (item: ThongBaoItem) => void;
  /**
   * Bảng chuông đang mở. Bảng nằm trên cụm tab, DƯỚI các màn mở từ nó (chi
   * tiết, bình luận): back hết là thấy lại bảng y như lúc bấm.
   */
  bellOpen: boolean;
  setBellOpen: (open: boolean) => void;
};

const ThongBaoContext = createContext<ThongBaoContextValue | null>(null);

/**
 * Số chưa đọc trên chuông + kết nối realtime thông báo + toast thông báo mới
 * (8-Mobile-ThongBao). Bọc ngoài stack của app nên chỉ sống lúc đã đăng nhập;
 * đăng xuất là bỏ nghe và đóng kết nối hub (nếu không còn khung bình luận).
 *
 * Bảng chuông và màn "Xem tất cả" tự nghe "ThongBaoMoi" để chèn dòng mới.
 */
export function ThongBaoProvider({ children }: React.PropsWithChildren) {
  const [soChuaDoc, setSoChuaDocState] = useState(0);
  const [toast, setToast] = useState<ThongBaoItem | null>(null);
  const [bellOpen, setBellOpenState] = useState(false);
  const requestRef = useRef(0);
  const bellOpenRef = useRef(false);

  const setSoChuaDoc = useCallback((value: number) => {
    // Số từ realtime / đánh dấu đọc mới hơn lượt get-list đang chờ.
    requestRef.current += 1;
    setSoChuaDocState(Math.max(0, value));
    // Số trên icon app đi theo số chuông (mục 6) — đặt, không xoá về 0.
    syncThongBaoBadge(value);
  }, []);

  const refreshSoChuaDoc = useCallback(async () => {
    const requestId = ++requestRef.current;
    try {
      const result = await thongBaoGetList({ pageSize: 1 });
      if (requestId === requestRef.current) {
        const next = Math.max(0, Number(result?.soChuaDoc) || 0);
        setSoChuaDocState(next);
        syncThongBaoBadge(next);
      }
    } catch (err) {
      // Giữ số cũ: mất mạng thoáng qua không làm chuông mất số.
      warn("[ThongBao] Tải số chưa đọc thất bại", err);
    }
  }, []);

  const openThongBao = useCallback(
    (item: ThongBaoItem) => {
      if (!item.daDoc) {
        thongBaoDaDoc([item.id])
          .then((left) => left != null && setSoChuaDoc(left))
          .catch((err) => warn("[ThongBao] Đánh dấu đã đọc thất bại", err));
      }

      // Màn đích tự báo "Không tìm thấy" khi đã xoá / hết quyền xem (mục 4).
      // Chồng lên chỗ đang đứng: back hết là về đúng chỗ đã bấm.
      const target = resolveThongBaoTarget(item);
      if (target) pushScreensFromRef(getThongBaoScreens(target));
    },
    [setSoChuaDoc],
  );

  const setBellOpen = useCallback((open: boolean) => {
    bellOpenRef.current = open;
    setBellOpenState(open);
    if (open) setToast(null);
  }, []);

  useEffect(() => {
    refreshSoChuaDoc();

    // 1 toast mỗi thông báo: hub và push foreground có thể cùng tới. Đang xem
    // danh sách thì dòng mới đã chèn lên đầu — khỏi toast. Bảng chuông chỉ hiện
    // khi Trang chủ ở trên cùng (màn chồng lên che mất bảng).
    const showToast = (item: ThongBaoItem) => {
      if (!claimThongBaoToast(item.id)) return;
      const route = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
      const onList = (bellOpenRef.current && route === "Home") || route === "ThongBao";
      if (!onList) setToast(item);
    };

    const unsubscribe = subscribeThongBao({
      onThongBaoMoi: (thongBao, next) => {
        if (next != null) setSoChuaDoc(next);
        else refreshSoChuaDoc();
        showToast(thongBao);
      },
      onSoChuaDoc: setSoChuaDoc,
      onReconnected: refreshSoChuaDoc,
    });

    // Push THONG_BAO lúc app đang mở (usePushNotifications không hiện banner hệ
    // thống): cập nhật số + toast nếu hub chưa kịp báo. Bấm push đã đọc → số mới.
    const unsubscribePush = subscribeThongBaoPush((event) => {
      if (event.kind === "read") {
        setSoChuaDoc(event.soChuaDoc);
        return;
      }
      const next = getPushSoChuaDoc(event.data);
      if (next != null) setSoChuaDoc(next);
      else refreshSoChuaDoc();
      const item = thongBaoItemFromPush(event.data);
      if (item) showToast(item);
    });

    // Nằm nền lâu thì kết nối có thể đã rớt hẳn và đã lỡ thông báo.
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState !== "active") return;
      refreshSoChuaDoc();
      reconnectTraoDoiIfNeeded();
    });

    return () => {
      unsubscribe();
      unsubscribePush();
      subscription.remove();
      // Rời phiên (đăng xuất): icon + khay không còn thông báo của người cũ.
      syncThongBaoBadge(0);
    };
  }, [refreshSoChuaDoc, setSoChuaDoc]);

  const value = useMemo(
    () => ({ soChuaDoc, setSoChuaDoc, refreshSoChuaDoc, openThongBao, bellOpen, setBellOpen }),
    [bellOpen, openThongBao, refreshSoChuaDoc, setBellOpen, setSoChuaDoc, soChuaDoc],
  );

  return (
    <ThongBaoContext.Provider value={value}>
      {children}
      <ThongBaoToast
        item={toast}
        onPress={(item) => {
          setToast(null);
          openThongBao(item);
        }}
        onDismiss={() => setToast(null)}
      />
    </ThongBaoContext.Provider>
  );
}

export const useThongBaoContext = () => {
  const value = useContext(ThongBaoContext);
  if (!value) throw new Error("useThongBaoContext phải nằm trong ThongBaoProvider");
  return value;
};
