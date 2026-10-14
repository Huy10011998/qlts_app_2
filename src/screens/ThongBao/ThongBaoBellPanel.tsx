import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { navigateFromRef } from "../../navigation/navigationService";
import { thongBaoDaDoc, thongBaoGetList } from "../../services/data/thongBaoApi";
import { subscribeThongBao } from "../../services/realtime/traoDoiHub";
import type { ThongBaoItem } from "../../types/index";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import { COMPACT_TEXT_MAX_SCALE } from "../../utils/helpers/textScaling";
import { elevation } from "../../utils/helpers/tokens";
import { getWorkflowErrorMessage } from "../Workflow/shared/workflowErrors";
import ThongBaoRow from "./ThongBaoRow";
import { useThongBaoContext } from "./ThongBaoProvider";
import { BELL_PAGE_SIZE, markThongBaoRead, prependThongBao } from "./thongBaoRules";

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Bảng thả xuống khi bấm chuông (mục 1): 20 thông báo mới nhất, "Đánh dấu tất
 * cả đã đọc", "Xem tất cả" mở màn Thông báo phân trang.
 */
export default function ThongBaoBellPanel({ visible, onClose }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  const { soChuaDoc, setSoChuaDoc, openThongBao, setBellOpen } = useThongBaoContext();

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

  useEffect(() => {
    setBellOpen(visible);
    if (!visible) return;

    load();
    const unsubscribe = subscribeThongBao({
      onThongBaoMoi: (thongBao) =>
        setItems((prev) => prependThongBao(prev, thongBao).slice(0, BELL_PAGE_SIZE)),
      onReconnected: load,
    });
    return () => {
      unsubscribe();
      setBellOpen(false);
    };
  }, [load, setBellOpen, visible]);

  const open = (item: ThongBaoItem) => {
    setItems((prev) => markThongBaoRead(prev, [item.id]));
    onClose();
    openThongBao(item);
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const left = await thongBaoDaDoc([]);
      setSoChuaDoc(left ?? 0);
      setItems((prev) => markThongBaoRead(prev, "all"));
    } catch (err) {
      Alert.alert("Thông báo", getWorkflowErrorMessage(err, "Không đánh dấu được đã đọc."));
    } finally {
      setMarkingAll(false);
    }
  };

  const renderEmpty = () => {
    if (loading) return <ActivityIndicator style={styles.state} color={c.textSub} />;
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Đóng thông báo" />
      <View style={[styles.panel, { top: insets.top + 54 }]}>
        <View style={styles.header}>
          <Text style={styles.heading} maxFontSizeMultiplier={COMPACT_TEXT_MAX_SCALE}>
            Thông báo
          </Text>
          {soChuaDoc > 0 ? (
            <TouchableOpacity onPress={markAllRead} disabled={markingAll} hitSlop={8}>
              <Text
                style={[styles.link, markingAll && styles.linkBusy]}
                maxFontSizeMultiplier={COMPACT_TEXT_MAX_SCALE}
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
            onClose();
            navigateFromRef("ThongBao");
          }}
          accessibilityRole="button"
        >
          <Text style={styles.link} maxFontSizeMultiplier={COMPACT_TEXT_MAX_SCALE}>
            Xem tất cả
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
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
      maxHeight: "72%",
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
