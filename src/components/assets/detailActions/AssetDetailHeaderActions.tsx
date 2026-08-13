import React from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { Field } from "../../../types";
import type { AssetItem } from "../../../types/navigator.d";
import SlideInSidePanel from "../../shared/SlideInSidePanel";
import HeaderDetailActionsRight from "../../header/HeaderDetailActionButtons";
import AssetListEmptyState from "../shared/AssetListEmptyState";
import { BRAND_RED } from "../shared/listTheme";
import { useSlideInPanel } from "../../../hooks/useSlideInPanel";
import { useFridgeMenuItems } from "../../../screens/NoiDia/shared/useFridgeMenuItems";
import { useKhachHangMenuItems } from "../../../screens/NoiDia/shared/useKhachHangMenuItems";
import {
  AppColors,
  useAppColors,
  useSeparatorColor,
  useStyles,
} from "../../../utils/helpers/colors";
import type { DetailMenuItem } from "./detailMenuTypes";
import {
  getRecordLabel,
  useAssetRecordActions,
} from "./useAssetRecordActions";

const MENU_WIDTH = Dimensions.get("window").width * 0.6;

type AssetDetailHeaderActionsProps = {
  item: AssetItem | null | undefined;
  nameClass?: string;
  fieldActive?: Field[];
  /** Mục nghiệp vụ riêng của màn, ví dụ Báo hỏng / Thanh lý ở màn chi tiết QR. */
  extraItems?: DetailMenuItem[];
  loadErrorMessage?: string | null;
};

/**
 * Toàn bộ thao tác của màn chi tiết, gom vào góc phải header: nút Sửa và một
 * menu ⋯.
 *
 * Đây là component DUY NHẤT được `setOptions({ headerRight })` trong màn chi
 * tiết. Trước đây mỗi nghiệp vụ (tủ lạnh, khách hàng) tự chiếm `headerRight` và
 * tự dựng panel riêng, nên thêm nghiệp vụ thứ ba là tranh nhau; giờ mỗi nghiệp
 * vụ chỉ góp mục qua hook trả `DetailMenuItem[]`.
 *
 * Phải đặt ở CUỐI cây của màn: panel dùng `absoluteFill`, render trước thì bị
 * nội dung và thanh chuyển mục phủ lên.
 */
export default function AssetDetailHeaderActions({
  item,
  nameClass,
  fieldActive,
  extraItems,
  loadErrorMessage,
}: AssetDetailHeaderActionsProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const separatorColor = useSeparatorColor();
  const navigation = useNavigation<any>();

  const { allowEdit, allowClone, allowDelete, onEdit, onClone, onDelete } =
    useAssetRecordActions({ item, nameClass, fieldActive });
  const fridgeItems = useFridgeMenuItems({ nameClass, item: item ?? null });
  const khachHangItems = useKhachHangMenuItems({
    nameClass,
    item: item ?? null,
  });

  const items = React.useMemo(() => {
    const list: DetailMenuItem[] = [
      ...fridgeItems,
      ...khachHangItems,
      ...(extraItems ?? []),
    ];

    if (allowClone) {
      list.push({
        key: "clone",
        label: "Bản sao",
        icon: "copy-outline",
        onPress: onClone,
      });
    }

    if (allowDelete) {
      list.push({
        key: "delete",
        label: "Xóa",
        icon: "trash-outline",
        tone: "danger",
        onPress: onDelete,
      });
    }

    return list;
  }, [
    allowClone,
    allowDelete,
    extraItems,
    fridgeItems,
    khachHangItems,
    onClone,
    onDelete,
  ]);

  const { closePanel, togglePanel, translateAnim, visible } = useSlideInPanel({
    initialOffset: MENU_WIDTH,
  });

  const hasMenu = items.length > 0 || Boolean(loadErrorMessage);
  // Tiêu đề header là tên loại tài sản; badge mang mã bản ghi để cuộn tới đâu
  // cũng biết đang xem cái nào.
  const recordLabel = getRecordLabel(item, fieldActive);

  // Cố ý chỉ phụ thuộc boolean và callback ổn định, KHÔNG phụ thuộc `items`:
  // mảng mới mỗi render sẽ làm effect dưới setOptions lặp vô hạn.
  const renderHeaderRight = React.useCallback(
    () => (
      <HeaderDetailActionsRight
        showEdit={allowEdit}
        onEditPress={onEdit}
        showMenu={hasMenu}
        onMenuPress={togglePanel}
      />
    ),
    [allowEdit, hasMenu, onEdit, togglePanel],
  );

  React.useEffect(() => {
    navigation.setOptions({
      headerRight: allowEdit || hasMenu ? renderHeaderRight : undefined,
      headerBadgeLabel: recordLabel || undefined,
    });

    return () =>
      navigation.setOptions({
        headerRight: undefined,
        headerBadgeLabel: undefined,
      });
  }, [allowEdit, hasMenu, navigation, recordLabel, renderHeaderRight]);

  const handleItemPress = React.useCallback(
    (menuItem: DetailMenuItem) => {
      // Đóng panel trước rồi mới chạy: `useSlideInPanel` bỏ qua closePanel khi
      // đang animate, và Alert của mục Xóa không được bật khi panel còn phủ.
      if (menuItem.closeOnPress !== false) closePanel();

      menuItem.onPress();
    },
    [closePanel],
  );

  if (!allowEdit && !hasMenu) return null;

  return (
    <SlideInSidePanel
      bodyStyle={styles.menuContent}
      onClose={closePanel}
      showCloseButton={false}
      title="Menu"
      translateX={translateAnim}
      visible={visible}
      width={MENU_WIDTH}
    >
      {loadErrorMessage ? (
        <AssetListEmptyState
          iconName="cloud-offline-outline"
          title="Không thể tải menu"
          subtitle={loadErrorMessage}
        />
      ) : (
        items.map((menuItem, index) => {
          const isDanger = menuItem.tone === "danger";
          // Vạch tách trước nhóm nguy hiểm để không bấm nhầm theo phản xạ.
          const needsDivider = isDanger && index > 0;

          return (
            <View key={menuItem.key}>
              {needsDivider ? (
                <View
                  style={[styles.divider, { backgroundColor: separatorColor }]}
                />
              ) : null}
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  { borderBottomColor: separatorColor },
                  menuItem.disabled && styles.menuItemDisabled,
                ]}
                onPress={() => handleItemPress(menuItem)}
                disabled={menuItem.disabled}
              >
                <View style={styles.menuItemRow}>
                  {menuItem.icon ? (
                    <Ionicons
                      name={menuItem.icon}
                      size={18}
                      color={isDanger ? BRAND_RED : c.textSub}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.menuItemText,
                      isDanger && styles.menuItemTextDanger,
                    ]}
                  >
                    {menuItem.label}
                  </Text>
                </View>
                {menuItem.sublabel ? (
                  <Text style={styles.menuItemSub}>{menuItem.sublabel}</Text>
                ) : null}
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </SlideInSidePanel>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
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
    menuItemDisabled: {
      opacity: 0.55,
    },
    menuItemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    menuItemText: {
      fontSize: 15,
      color: c.text,
      fontWeight: "500",
    },
    menuItemTextDanger: {
      color: BRAND_RED,
      fontWeight: "700",
    },
    menuItemSub: {
      marginTop: 4,
      marginLeft: 28,
      fontSize: 12,
      color: c.textSecondary,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginVertical: 8,
    },
  });
