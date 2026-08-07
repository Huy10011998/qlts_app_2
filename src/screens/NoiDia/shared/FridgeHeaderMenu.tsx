import React, { useCallback, useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import SlideInSidePanel from "../../../components/shared/SlideInSidePanel";
import { useSlideInPanel } from "../../../hooks/useSlideInPanel";
import {
  AppColors,
  useSeparatorColor,
  useStyles,
} from "../../../utils/helpers/colors";
import { FRIDGE_NAME_CLASS, toFridgeSummary } from "./fridgeLookup";

const MENU_WIDTH = Dimensions.get("window").width * 0.6;

function FridgeMenuButton({ onPress }: { onPress: () => void }) {
  const styles = useStyles(makeStyles);

  return (
    <TouchableOpacity onPress={onPress} style={styles.headerButton} hitSlop={8}>
      <Ionicons name="menu" size={26} color="#fff" />
    </TouchableOpacity>
  );
}

/**
 * Menu nghiệp vụ tủ lạnh ở góc phải header màn chi tiết tài sản.
 *
 * Cùng bộ mục và cùng kiểu panel với menu ☰ của màn chi tiết QR, để dù vào từ
 * quét mã hay từ danh sách tài sản thì thao tác vẫn nằm đúng một chỗ. Chỉ hiện
 * với class NoiDia_TuLanh — xác nhận vị trí và trung chuyển là nghiệp vụ riêng
 * của tủ lạnh nội địa, không phải thao tác chung của mọi loại tài sản.
 *
 * Phải đặt SAU phần nội dung màn: panel dùng `absoluteFill`, render trước thì
 * bị nội dung phủ lên.
 */
export default function FridgeHeaderMenu({
  nameClass,
  item,
}: {
  nameClass?: string;
  item: Record<string, any> | null;
}) {
  const styles = useStyles(makeStyles);
  const separatorColor = useSeparatorColor();
  const navigation = useNavigation<any>();

  // Memo hoá: `toFridgeSummary` tạo object mới mỗi lần gọi, không memo thì
  // effect bên dưới chạy lại sau mỗi render và setOptions thành vòng lặp.
  const fridge = useMemo(
    () =>
      nameClass === FRIDGE_NAME_CLASS && item ? toFridgeSummary(item) : null,
    [item, nameClass],
  );

  const {
    closePanel: closeMenu,
    togglePanel: toggleMenu,
    translateAnim: slideAnim,
    visible: menuVisible,
  } = useSlideInPanel({ initialOffset: MENU_WIDTH });

  const renderHeaderRight = useCallback(
    () => <FridgeMenuButton onPress={toggleMenu} />,
    [toggleMenu],
  );

  useEffect(() => {
    if (!fridge) return;

    navigation.setOptions({ headerRight: renderHeaderRight });

    return () => navigation.setOptions({ headerRight: undefined });
  }, [fridge, navigation, renderHeaderRight]);

  const goTo = useCallback(
    (screen: string) => {
      if (!fridge) return;

      closeMenu();
      navigation.navigate(screen, { fridge });
    },
    [closeMenu, fridge, navigation],
  );

  if (!fridge) return null;

  return (
    <SlideInSidePanel
      bodyStyle={styles.menuContent}
      onClose={closeMenu}
      showCloseButton={false}
      title="Menu"
      translateX={slideAnim}
      visible={menuVisible}
      width={MENU_WIDTH}
    >
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: separatorColor }]}
        onPress={() => goTo("XacNhanViTriTuLanhLichSu")}
      >
        <Text style={styles.menuItemText}>Xác nhận vị trí</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: separatorColor }]}
        onPress={() => goTo("TrungChuyenTuLanhLichSu")}
      >
        <Text style={styles.menuItemText}>Trung chuyển</Text>
      </TouchableOpacity>
    </SlideInSidePanel>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    headerButton: {
      paddingHorizontal: 8,
    },
    menuContent: {
      padding: 16,
      paddingBottom: 24,
    },
    menuItem: {
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    menuItemText: {
      fontSize: 15,
      color: c.text,
      fontWeight: "500",
    },
  });
