import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAutoReload } from "../../hooks/useAutoReload";
import { navigateFromRef, navigationRef } from "../../navigation/navigationService";
import { thongBaoDaDoc, thongBaoGetList } from "../../services/data/thongBaoApi";
import { subscribeThongBao } from "../../services/realtime/traoDoiHub";
import type { ThongBaoItem } from "../../types/index";
import { AppColors, useStyles } from "../../utils/helpers/colors";
import { elevation } from "../../utils/helpers/tokens";
import { getWorkflowErrorMessage } from "../Workflow/shared/workflowErrors";
import ThongBaoRow from "./ThongBaoRow";
import ThongBaoRowSkeleton, { THONG_BAO_ROW_HEIGHT } from "./ThongBaoRowSkeleton";
import { useThongBaoContext } from "./ThongBaoProvider";
import { BELL_PAGE_SIZE, markThongBaoRead, prependThongBao } from "./thongBaoRules";
import { AppAlert } from "../../components/ui/AppAlert";

/** `maxHeight` của bảng, phần trăm chiều cao cụm tab (phủ kín màn). */
const PANEL_MAX_PERCENT = 72;
const FADE_MS = 200;

/**
 * Bảng thả xuống khi bấm chuông (mục 1): 20 thông báo mới nhất, "Đánh dấu tất
 * cả đã đọc", "Xem tất cả" mở màn Thông báo phân trang.
 *
 * Không dùng Modal (Modal luôn đè lên mọi màn): bảng là lớp phủ nằm trên cụm
 * tab (`Tabs.tsx`), dưới các màn của stack gốc. Bấm 1 thông báo thì chi tiết /
 * bình luận chồng lên trên, bảng vẫn mở bên dưới — back về là thấy ngay, giữ
 * nguyên danh sách + chỗ cuộn, không mở lại.
 */
export default function ThongBaoBellPanel() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const {
    soChuaDoc,
    setSoChuaDoc,
    openThongBao,
    bellOpen: visible,
    setBellOpen,
  } = useThongBaoContext();
  // Còn trên màn trong lúc mờ dần đi; mờ hẳn mới gỡ (lần mở sau cuộn từ đầu).
  const [shown, setShown] = useState(visible);
  const opacity = useRef(new Animated.Value(0)).current;

  const [items, setItems] = useState<ThongBaoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const result = await thongBaoGetList({ pageSize: BELL_PAGE_SIZE });
      if (requestId !== requestRef.current) return;
      setItems(Array.isArray(result?.items) ? result.items : []);
      setSoChuaDoc(Number(result?.soChuaDoc) || 0);
      setErrorMessage(null);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setErrorMessage(getWorkflowErrorMessage(err, "Không tải được thông báo."));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [setSoChuaDoc]);

  const close = useCallback(() => setBellOpen(false), [setBellOpen]);

  useEffect(() => {
    if (visible) setShown(true);
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setShown(false);
    });
  }, [opacity, visible]);

  useEffect(() => {
    if (!visible) return;

    load();
    // Nghe cả lúc đang ở chi tiết (bảng nằm dưới): back về danh sách đã mới.
    const unsubscribe = subscribeThongBao({
      onThongBaoMoi: (thongBao) =>
        setItems((prev) => prependThongBao(prev, thongBao).slice(0, BELL_PAGE_SIZE)),
      onReconnected: load,
    });
    // Android back: đóng bảng như Modal cũ — trừ khi có màn chồng lên (back của màn đó).
    const backSubscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (navigationRef.getCurrentRoute()?.name !== "Home") return false;
      close();
      return true;
    });
    return () => {
      unsubscribe();
      backSubscription.remove();
    };
  }, [close, load, visible]);

  // Mở bảng rồi ra nền: thông báo đến lúc nằm nền. Khung chờ chỉ hiện khi danh
  // sách rỗng nên nạp lại không nháy.
  useAutoReload(load, { enabled: visible });

  // Bảng vẫn mở bên dưới chi tiết vừa mở.
  const open = (item: ThongBaoItem) => {
    setItems((prev) => markThongBaoRead(prev, [item.id]));
    openThongBao(item);
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const left = await thongBaoDaDoc([]);
      setSoChuaDoc(left ?? 0);
      setItems((prev) => markThongBaoRead(prev, "all"));
    } catch (err) {
      AppAlert.alert("Thông báo", getWorkflowErrorMessage(err, "Không đánh dấu được đã đọc."));
    } finally {
      setMarkingAll(false);
    }
  };

  /*
   * Lần mở đầu (bảng nằm sẵn trên cụm tab, mở lại thì danh sách cũ vẫn còn
   * nên không tới đây): vòng xoay cũ chỉ cao ~76 rồi bảng giãn vọt tới trần 72%
   * khi 20 dòng về. BE trả 20 thông báo mới nhất bất kể đã đọc, nên thường là
   * đầy bảng — dựng đủ dòng để chạm trần ngay từ đầu; dòng thừa bị danh sách
   * cắt (FlatList co lại dưới `maxHeight`, chính là lúc có 20 dòng thật).
   *
   * Số dòng cố định chứ không tự đo: danh sách `flexGrow: 0` cao theo nội dung,
   * khung chờ tự đếm theo chiều cao của chính nó thì chạy vòng.
   */
  const skeletonRows = Math.ceil(
    (windowHeight * PANEL_MAX_PERCENT) / 100 / THONG_BAO_ROW_HEIGHT,
  );

  const renderEmpty = () => {
    if (loading) return <ThongBaoRowSkeleton rows={skeletonRows} />;
    if (errorMessage) {
      return (
        <View style={styles.state}>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <TouchableOpacity onPress={load} style={styles.retry}>
            <Text style={styles.link}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.state}>
        <Text style={styles.stateText}>Không có thông báo</Text>
      </View>
    );
  };

  if (!visible && !shown) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity }]}
      pointerEvents={visible ? "auto" : "none"}
      accessibilityViewIsModal={visible}
    >
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Đóng thông báo" />
      <View style={[styles.panel, { top: insets.top + 54 }]}>
        <View style={styles.header}>
          <Text style={styles.heading}>
            Thông báo
          </Text>
          {soChuaDoc > 0 ? (
            <TouchableOpacity onPress={markAllRead} disabled={markingAll} hitSlop={8}>
              <Text
                style={[styles.link, markingAll && styles.linkBusy]}
              >
                Đánh dấu tất cả đã đọc
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ThongBaoRow item={item} onPress={open} />}
          ListEmptyComponent={renderEmpty}
          style={styles.list}
        />

        <TouchableOpacity
          style={styles.footer}
          onPress={() => {
            close();
            navigateFromRef("ThongBao");
          }}
          accessibilityRole="button"
        >
          <Text style={styles.link}>
            Xem tất cả
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    panel: {
      position: "absolute",
      left: 10,
      right: 10,
      maxHeight: `${PANEL_MAX_PERCENT}%` as const,
      backgroundColor: c.surface,
      borderRadius: 14,
      overflow: "hidden",
      ...elevation(c.shadow, 3),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },
    heading: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
    link: {
      fontSize: 13,
      fontWeight: "600",
      color: "#1e88e5",
    },
    linkBusy: {
      color: c.textMuted,
    },
    list: {
      flexGrow: 0,
    },
    state: {
      alignItems: "center",
      paddingVertical: 28,
    },
    stateText: {
      fontSize: 13,
      color: c.textSub,
      textAlign: "center",
      paddingHorizontal: 16,
    },
    retry: {
      marginTop: 8,
    },
    footer: {
      alignItems: "center",
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
    },
  });
