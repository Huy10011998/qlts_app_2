import { StyleSheet } from "react-native";

import { AppColors } from "../../../utils/helpers/colors";
import { cardShadow } from "../../../components/assets/shared/listTheme";
import { ADD_FAB_CLEARANCE } from "../../../components/add/shared/AddActionFab";

/**
 * Style dùng chung cho ba màn danh sách của nhóm Nội địa.
 *
 * Lấy đúng số đo của danh sách tài sản (`ListCardAsset`: lề 12/6, padding 16,
 * bo 16, avatar tròn 48) để hai nhóm màn nhìn như một app, thay vì mỗi nhóm một
 * cỡ thẻ. Phần khác biệt chỉ nằm ở nội dung từng dòng.
 */
export const makeNoiDiaListStyles = (c: AppColors) =>
  StyleSheet.create({
    listContent: {
      flexGrow: 1,
      paddingTop: 2,
      paddingBottom: 24,
    },
    // Chừa chỗ cho AddActionFab để thẻ cuối không bị nút che mất.
    listContentWithFab: {
      paddingBottom: ADD_FAB_CLEARANCE,
    },
    emptyRoot: {
      flexGrow: 1,
      justifyContent: "center",
    },

    card: {
      flexDirection: "row",
      backgroundColor: c.surface,
      marginHorizontal: 12,
      marginVertical: 6,
      padding: 16,
      borderRadius: 16,
      ...cardShadow(c),
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.redSurface,
      marginRight: 16,
      overflow: "hidden",
    },
    info: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 14.5,
      fontWeight: "700",
      color: c.text,
    },
    text: {
      marginTop: 3,
      fontSize: 13,
      color: c.text,
    },
    label: {
      fontWeight: "bold",
      color: c.text,
    },
    /** Giá trị cần người duyệt để ý — hiện tại là khoảng cách vượt mốc. */
    textDanger: {
      color: c.red,
      fontWeight: "700",
    },
    meta: {
      marginTop: 3,
      fontSize: 12,
      color: c.textSub,
    },
    /** Dòng ngày giờ đứng đầu thẻ lịch sử — mốc user quét mắt tìm trước tiên. */
    cardDate: {
      fontSize: 13,
      fontWeight: "700",
      color: c.red,
      marginBottom: 2,
    },
    note: {
      marginTop: 6,
      fontSize: 13,
      fontStyle: "italic",
      color: c.textSecondary,
    },
    /** Nhãn "Ghi chú:" đứng trước nội dung — chỉ nhãn đứng thẳng, chữ vẫn nghiêng. */
    noteLabel: {
      fontStyle: "normal",
      fontWeight: "bold",
      color: c.text,
    },
    chevron: {
      alignSelf: "center",
      marginLeft: 8,
    },

    /**
     * Chân thẻ xếp dọc: tên nhân viên tiếng Việt hay dài quá một dòng, ép chung
     * hàng với nút "xem bản đồ" là cắt mất tên. Nút xuống dòng riêng, sát phải.
     */
    footerRow: {
      marginTop: 8,
    },
    footerText: {
      fontSize: 12,
      color: c.textSub,
    },
    footerAction: {
      alignSelf: "flex-end",
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginTop: 4,
      paddingVertical: 2,
    },
    footerActionText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.red,
    },

    /** Hai ô chọn ngày mở ra dưới thẻ lọc. */
    dateRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 10,
    },
    dateField: {
      flex: 1,
    },
    dateLabel: {
      marginBottom: 4,
      fontSize: 11.5,
      fontWeight: "600",
      color: c.textSub,
    },
    /** Ghi chú khi danh sách chạm mốc Top của BE — tránh tưởng đã xem hết. */
    capNotice: {
      marginTop: 4,
      marginHorizontal: 16,
      textAlign: "center",
      fontSize: 12,
      fontStyle: "italic",
      color: c.textSub,
    },
    /** Spinner thay chevron trong thẻ lọc lúc đang tải lại theo bộ lọc. */
    inlineSpinner: {
      flex: 0,
      width: 16,
    },
    filterActions: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    clearFilterButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 4,
    },
    applyFilterButton: {
      minWidth: 84,
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 18,
      borderRadius: 10,
      backgroundColor: c.red,
    },
    applyFilterButtonDisabled: {
      backgroundColor: c.slateBorder,
    },
    applyFilterText: {
      fontSize: 13.5,
      fontWeight: "700",
      color: "#fff",
    },
    clearFilterText: {
      fontSize: 12.5,
      fontWeight: "600",
      color: c.red,
    },

  });
