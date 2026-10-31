import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  LayoutRectangle,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import SkeletonBlock from "../../../../components/ui/SkeletonBlock";
import { useSkeletonPulse } from "../../../../components/ui/useSkeletonAutoFill";
import { cvDelete, cvThongTin } from "../../../../services/data/congViecApi";
import { CV_CONG_VIEC_NAME_CLASS } from "../../../../services/data/workflowApi";
import { useAppSelector } from "../../../../store/hooks";
import type {
  CongViecItem,
  CongViecThongTin,
  StackNavigation,
} from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { useWorkflowMe } from "../../shared/useWorkflowMe";
import { useWorkflowPermissions } from "../../shared/useWorkflowPermissions";
import { useMarkWorkflowChanged } from "../../shared/useWorkflowVersion";
import { getCongViecTrangThai } from "../../shared/workflowConstants";
import { getWorkflowErrorMessage } from "../../shared/workflowErrors";
import {
  CongViecQuickAction,
  getCongViecActions,
  getCongViecQuickActions,
} from "../congViecRules";
import ChuyenTrangThaiSheet from "./ChuyenTrangThaiSheet";
import DoiChuTriSheet from "./DoiChuTriSheet";
import GiaHanSheet from "./GiaHanSheet";
import { AppAlert } from "../../../../components/ui/AppAlert";
import { showAppToast } from "../../../../components/ui/AppToast";

/** Toạ độ nút ⋯ theo cửa sổ (`measureInWindow`). */
export type QuickActionAnchor = { x: number; y: number; width: number; height: number };

type MenuAction = CongViecQuickAction | "chiTiet";
type SubSheet = Extract<CongViecQuickAction, "chuyenTrangThai" | "giaHan" | "doiChuTri">;

const OPTION_META: Record<MenuAction, { icon: string; label: string; danger?: boolean }> = {
  chiTiet: { icon: "reader-outline", label: "Xem chi tiết" },
  chuyenTrangThai: { icon: "swap-vertical-outline", label: "Chuyển trạng thái" },
  giaHan: { icon: "time-outline", label: "Gia hạn" },
  doiChuTri: { icon: "swap-horizontal-outline", label: "Đổi chủ trì" },
  sua: { icon: "create-outline", label: "Sửa" },
  nhanBan: { icon: "copy-outline", label: "Nhân bản" },
  xoa: { icon: "trash-outline", label: "Xoá", danger: true },
};

const MENU_WIDTH = 272;
const EDGE = 12;
const ARROW = 9;
/** Khoảng hở giữa mũi nhọn và icon ⋯. */
const ARROW_GAP = 4;
const RADIUS = 22;
/** Cờ quyền về trong chừng này thì hiện thẳng menu đủ nút, khỏi qua khung chờ. */
const SKELETON_DELAY = 250;

type Props = {
  /**
   * Việc vừa bấm ⋯ + vị trí nút; null = đóng. `info` = cv-thong-tin màn gọi đã
   * có — menu hiện ngay bằng cờ đó trong lúc hỏi lại server.
   */
  target: {
    item: CongViecItem;
    anchor: QuickActionAnchor;
    info?: CongViecThongTin;
  } | null;
  onClose: () => void;
};

/**
 * Bấm ⋯ trên một việc: khung "Chọn chức năng" nổi cạnh nút, mũi nhọn chỉ vào
 * nút, mỗi thao tác một nút bo tròn. Mỗi lần mở hỏi lại cv-thong-tin của đúng
 * việc ấy, nút theo cùng luật màn chi tiết. Chuyển trạng thái, Gia hạn, Đổi
 * chủ trì mở sheet sẵn có của màn chi tiết.
 *
 * Không dùng Modal: đặt làm lớp phủ cuối cùng của màn (như bảng chuông Trang
 * chủ) — toạ độ nút ⋯ và lớp phủ đo cùng một cửa sổ, Android không lệch thanh
 * trạng thái như khi Modal nằm cửa sổ riêng.
 */
export default function CongViecQuickActionMenu({ target, onClose }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const opacity = useSkeletonPulse();
  const navigation = useNavigation<StackNavigation<"CongViecChiTiet">>();
  const { canInsert, canUpdate, canDelete } = useWorkflowPermissions(CV_CONG_VIEC_NAME_CLASS);
  const { me } = useWorkflowMe();
  const markChanged = useMarkWorkflowChanged();
  const version = useAppSelector((state) => state.workflow.version);

  const [infos, setInfos] = useState<Record<number, CongViecThongTin>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [slow, setSlow] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [frame, setFrame] = useState<LayoutRectangle | null>(null);
  const [menuHeight, setMenuHeight] = useState(0);
  const [subSheet, setSubSheet] = useState<SubSheet | null>(null);
  const [subItem, setSubItem] = useState<CongViecItem | null>(null);
  const rootRef = useRef<View>(null);
  const appear = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const item = target?.item ?? null;

  // Dữ liệu Workflow đổi (ở đây hay màn khác) thì cờ đã nhớ có thể sai.
  useEffect(() => {
    setInfos({});
  }, [version]);

  useEffect(() => {
    if (!item) return;
    let active = true;
    setErrorMessage(null);
    setSlow(false);
    const timer = setTimeout(() => active && setSlow(true), SKELETON_DELAY);
    cvThongTin([item.id])
      .then((rows) => {
        if (!active) return;
        const row = rows.find((r) => r.id === item.id);
        if (row) setInfos((prev) => ({ ...prev, [row.id]: row }));
        else setErrorMessage("Không lấy được quyền của công việc.");
      })
      .catch((err) => {
        if (active) setErrorMessage(getWorkflowErrorMessage(err, "Không tải được thao tác."));
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [item, retryKey]);

  useEffect(() => {
    if (!target) {
      appear.setValue(0);
      setFrame(null);
      setMenuHeight(0);
      return;
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onCloseRef.current();
      return true;
    });
    return () => sub.remove();
  }, [appear, target]);

  // Rời màn (đổi tab, mở màn khác) thì đóng — quay lại không còn menu treo.
  useFocusEffect(useCallback(() => () => onCloseRef.current(), []));

  const rowInfo = item ? infos[item.id] ?? target?.info ?? null : null;
  const contentReady = !!rowInfo || !!errorMessage || slow;
  const ready = !!target && !!frame && menuHeight > 0 && contentReady;

  useEffect(() => {
    if (!ready) return;
    Animated.timing(appear, { toValue: 1, duration: 140, useNativeDriver: true }).start();
  }, [appear, ready]);

  const actions = getCongViecActions(item, rowInfo, { canUpdate, canDelete });
  // Nhân bản như nút + ở Lịch: chưa liên kết nhân viên thì không thêm được việc.
  const canNhanBan = canInsert && !!me.iD_NhanVien;
  const options: MenuAction[] = rowInfo
    ? ["chiTiet", ...getCongViecQuickActions(actions, canNhanBan)]
    : [];

  const measureRoot = () => {
    rootRef.current?.measureInWindow((x, y, width, height) =>
      setFrame({ x, y, width, height }),
    );
  };

  const confirmDelete = (task: CongViecItem) => {
    AppAlert.alert("Xoá công việc", "Xoá công việc này? Thao tác không hoàn tác được.", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            await cvDelete([task.id]);
            // Việc chỉ biến khỏi lịch khi tải lại ngầm xong — báo ngay kẻo tưởng chưa xoá.
            showAppToast({ message: "Đã xoá công việc", detail: task.soCongViec ?? undefined });
            markChanged();
            onClose();
          } catch (err) {
            AppAlert.alert("Không xoá được", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const pick = (key: MenuAction) => {
    if (!item) return;
    const id = item.id;

    if (key === "xoa") {
      confirmDelete(item);
      return;
    }

    onClose();
    switch (key) {
      case "chuyenTrangThai":
      case "giaHan":
      case "doiChuTri":
        setSubItem(item);
        setSubSheet(key);
        return;
      case "chiTiet":
        navigation.navigate("CongViecChiTiet", { id });
        return;
      case "sua":
        navigation.navigate("CongViecForm", { mode: "edit", id });
        return;
      case "nhanBan":
        navigation.navigate("CongViecForm", { mode: "add", cloneId: id });
        return;
    }
  };

  const handleSubDone = () => {
    setSubSheet(null);
    markChanged();
  };

  // Khung đứng bên trái nút ⋯, giữa khung ngang tâm nút (dồn vào trong khi
  // sát mép trên / dưới); mũi nhọn luôn chỉ đúng tâm nút.
  let menuStyle: ViewStyle | null = null;
  let arrowTop = 0;
  if (target && frame) {
    const anchorX = target.anchor.x - frame.x;
    const anchorCenterY = target.anchor.y - frame.y + target.anchor.height / 2;
    const right = anchorX - ARROW_GAP - ARROW;
    const width = Math.max(200, Math.min(MENU_WIDTH, right - EDGE));
    const maxTop = Math.max(EDGE, frame.height - EDGE - menuHeight);
    const top = Math.min(Math.max(anchorCenterY - menuHeight / 2, EDGE), maxTop);
    arrowTop = Math.min(
      Math.max(anchorCenterY - top - ARROW, RADIUS - 4),
      menuHeight - RADIUS + 4 - ARROW * 2,
    );
    menuStyle = {
      top,
      left: Math.max(EDGE, right - width),
      width,
      maxHeight: frame.height - EDGE * 2,
    };
  }

  const trangThai = item ? getCongViecTrangThai(item.trangThai) : null;

  return (
    <>
      {target ? (
        <View
          ref={rootRef}
          style={styles.root}
          onLayout={measureRoot}
          accessibilityViewIsModal
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            disabled={deleting}
            accessibilityLabel="Đóng menu"
          />
          <Animated.View
            onLayout={(event) => setMenuHeight(event.nativeEvent.layout.height)}
            style={[
              styles.menu,
              menuStyle ?? styles.menuHidden,
              {
                opacity: ready ? appear : 0,
                transform: [
                  { scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                ],
              },
            ]}
          >
            <View style={[styles.arrow, { top: arrowTop }]} />

            <Text style={styles.title}>Chọn chức năng</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {[item?.soCongViec, trangThai?.label].filter(Boolean).join(" · ")}
            </Text>

            {rowInfo ? (
              <ScrollView
                style={styles.options}
                contentContainerStyle={styles.optionsContent}
                alwaysBounceVertical={false}
                showsVerticalScrollIndicator={false}
              >
                {options.map((key) => {
                  const meta = OPTION_META[key];
                  const busy = key === "xoa" && deleting;
                  const tint = meta.danger ? c.red : c.accent;
                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.7}
                      style={[styles.option, meta.danger && styles.optionDanger]}
                      onPress={() => pick(key)}
                      disabled={deleting}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color={c.red} />
                      ) : (
                        <Ionicons name={meta.icon} size={17} color={tint} />
                      )}
                      <Text
                        style={[styles.optionText, meta.danger && styles.optionTextDanger]}
                        numberOfLines={1}
                      >
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
                <TouchableOpacity onPress={() => setRetryKey((key) => key + 1)} hitSlop={8}>
                  <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.optionsContent} accessibilityLabel="Đang tải thao tác">
                {[0, 1, 2, 3].map((index) => (
                  <SkeletonBlock key={index} opacity={opacity} style={styles.skeletonOption} />
                ))}
              </View>
            )}
          </Animated.View>
        </View>
      ) : null}

      {subItem ? (
        <>
          <ChuyenTrangThaiSheet
            visible={subSheet === "chuyenTrangThai"}
            idCongViec={subItem.id}
            trangThai={Number(subItem.trangThai)}
            onClose={() => setSubSheet(null)}
            onDone={handleSubDone}
          />
          <GiaHanSheet
            visible={subSheet === "giaHan"}
            idCongViec={subItem.id}
            denNgay={subItem.denNgay}
            onClose={() => setSubSheet(null)}
            onDone={handleSubDone}
          />
          <DoiChuTriSheet
            visible={subSheet === "doiChuTri"}
            idCongViec={subItem.id}
            idChuTriHienTai={subItem.iD_NhanVien_ChuTri}
            tenChuTriHienTai={subItem.chuTri_MoTa}
            onClose={() => setSubSheet(null)}
            onDone={handleSubDone}
          />
        </>
      ) : null}
    </>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      // Android vẽ theo elevation: thẻ ngày có elevation sẽ trồi lên trên lớp phủ.
      zIndex: 20,
      elevation: 20,
    },
    menu: {
      position: "absolute",
      backgroundColor: c.surface,
      borderRadius: RADIUS,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 14,
      shadowColor: c.shadow,
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
    },
    menuHidden: {
      top: 0,
      left: 0,
      width: MENU_WIDTH,
    },
    // Tam giác chỉ sang phải, dính mép phải khung.
    arrow: {
      position: "absolute",
      right: -ARROW,
      width: 0,
      height: 0,
      borderTopWidth: ARROW,
      borderBottomWidth: ARROW,
      borderLeftWidth: ARROW,
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
      borderLeftColor: c.surface,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 12,
      color: c.textSub,
      textAlign: "center",
      marginTop: 2,
      marginBottom: 12,
    },
    options: {
      flexGrow: 0,
      flexShrink: 1,
    },
    optionsContent: {
      gap: 8,
    },
    option: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 21,
      backgroundColor: c.surfaceAlt,
    },
    optionDanger: {
      backgroundColor: c.redSurface,
    },
    optionText: {
      flexShrink: 1,
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
    },
    optionTextDanger: {
      color: c.red,
    },
    skeletonOption: {
      height: 42,
      borderRadius: 21,
    },
    errorBox: {
      alignItems: "center",
      gap: 8,
      paddingVertical: 12,
    },
    errorText: {
      fontSize: 14,
      color: c.textSub,
      textAlign: "center",
    },
    retryText: {
      fontSize: 14,
      fontWeight: "700",
      color: c.red,
    },
  });
