import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import BottomSheetModalShell from "../../../components/shared/BottomSheetModalShell";
import EmptyState from "../../../components/ui/EmptyState";
import RecordListSkeleton from "../../../components/list/RecordListSkeleton";
import SearchBar from "../../../components/ui/SearchBar";
import { fetchDiemDanhChiTiet } from "../../../services/data/dashboardApi";
import {
  AppColors,
  C,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";
import { removeVietnameseTones } from "../../../utils/helpers/string";
import { error as logError } from "../../../utils/Logger";
import {
  mapDiemDanhChiTiet,
  type HomeAttendanceEmployee,
  type HomeDashboardDepartment,
} from "./homeData";
import {
  formatHomeNumber,
  formatHomePercent,
  getHomeRatioPercent,
} from "./homeFormat";

/** Chưa điểm danh hiện dấu này ở cột giờ, KHÔNG để trống. */
const NO_CHECK_IN_TIME = "---";

export type AttendanceFilterKey = "all" | "checkedIn" | "notCheckedIn";

const FILTERS: { key: AttendanceFilterKey; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "checkedIn", label: "Đã ĐD" },
  { key: "notCheckedIn", label: "Chưa ĐD" },
];

const normalize = (value: string) => removeVietnameseTones(value).trim();

/**
 * Lọc tại máy trên mảng ĐÃ TẢI — đổi bộ lọc hay gõ tìm kiếm không gọi lại API.
 * Tìm theo tên, mã nhân viên và chức danh, bỏ dấu hai đầu để gõ "chu van mat"
 * vẫn ra "Chu Văn Mật".
 */
export const filterAttendanceEmployees = (
  employees: HomeAttendanceEmployee[],
  filterKey: AttendanceFilterKey,
  searchQuery: string,
): HomeAttendanceEmployee[] => {
  const keyword = normalize(searchQuery);

  return employees.filter((employee) => {
    if (filterKey === "checkedIn" && !employee.checkedIn) return false;
    if (filterKey === "notCheckedIn" && employee.checkedIn) return false;
    if (!keyword) return true;

    return (
      normalize(employee.name).includes(keyword) ||
      normalize(employee.code).includes(keyword) ||
      normalize(employee.title ?? "").includes(keyword)
    );
  });
};

type HomeAttendanceDetailSheetProps = {
  /** null khi sheet đang đóng — mở lại với bộ phận khác thì gọi lại API. */
  department: HomeDashboardDepartment | null;
  onClose: () => void;
  visible: boolean;
};

function EmployeeRow({
  employee,
  isFirst,
}: {
  employee: HomeAttendanceEmployee;
  isFirst: boolean;
}) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  // Trạng thái phải khác nhau cả HÌNH icon lẫn chữ, không chỉ khác màu: xanh lá /
  // đỏ là cặp màu người mù màu khó tách nhất.
  const statusColor = employee.checkedIn ? C.emerald : C.rose;

  return (
    <View
      style={[
        styles.row,
        !isFirst && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: hairlineBorderColor,
        },
      ]}
    >
      <View style={styles.rowTextWrap}>
        <Text
          style={[styles.rowName, { color: colors.text }]}
          numberOfLines={1}
        >
          {employee.name}
        </Text>
        <Text
          style={[styles.rowMeta, { color: colors.textSub }]}
          numberOfLines={1}
        >
          {/* chucDanh = null nghĩa là chưa gán chức danh -> "—", đừng để trống. */}
          {employee.code ? `${employee.code} · ` : ""}
          {employee.title ?? "—"}
        </Text>
      </View>

      <View style={styles.rowStatus}>
        <Ionicons
          name={employee.checkedIn ? "checkmark-circle" : "close-circle"}
          size={18}
          color={statusColor}
        />
        <Text
          style={[styles.rowTime, { color: statusColor }]}
        >
          {employee.checkedIn ? employee.time ?? "—" : NO_CHECK_IN_TIME}
        </Text>
      </View>
    </View>
  );
}

/**
 * Danh sách nhân viên đã / chưa điểm danh của một bộ phận (endpoint [C]).
 *
 * Chỉ gọi API khi người dùng mở sheet cho một bộ phận cụ thể: khối điểm danh trên
 * Trang chủ đã có đủ số lượng để vẽ, còn lượt này kéo từng dòng nhân viên qua
 * linked server nên nặng hơn nhiều. Bộ lọc và ô tìm chạy tại máy.
 *
 * Thứ tự do server sắp (chưa điểm danh lên trước — đó là nhóm cần rà, trong mỗi
 * nhóm xếp theo tên) và được giữ NGUYÊN.
 */
export default function HomeAttendanceDetailSheet({
  department,
  onClose,
  visible,
}: HomeAttendanceDetailSheetProps) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const [employees, setEmployees] = useState<HomeAttendanceEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState<AttendanceFilterKey>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const deptCode = department?.code ?? null;
  const deptTotal = department?.total ?? 0;

  const loadDetail = useCallback(async () => {
    if (!deptCode) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const rows = mapDiemDanhChiTiet(await fetchDiemDanhChiTiet(deptCode));

      // Phạm vi nhân viên của [C] giống hệt [A], nên mảng rỗng trong khi [A] nói
      // bộ phận có người là lỗi đọc Bravo8 (server nuốt lỗi, trả rỗng thay vì
      // 500) — báo "không lấy được danh sách", đừng nói "bộ phận không có ai".
      if (rows.length === 0 && deptTotal > 0) {
        setEmployees([]);
        setErrorMessage(
          "Không lấy được danh sách nhân viên của bộ phận này. Vui lòng thử lại.",
        );
        return;
      }

      setEmployees(rows);
    } catch (e) {
      logError("[HomeAttendanceDetail] fetch error:", e);
      setEmployees([]);
      setErrorMessage(
        e instanceof Error && e.message.trim()
          ? e.message
          : "Không lấy được danh sách nhân viên của bộ phận này. Vui lòng thử lại.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [deptCode, deptTotal]);

  useEffect(() => {
    if (!visible) {
      // Đóng sheet là dọn sạch: mở lại bộ phận khác không được thấy danh sách cũ
      // nhấp nháy trong lúc chờ.
      setEmployees([]);
      setErrorMessage(null);
      setFilterKey("all");
      setSearchQuery("");
      return;
    }

    loadDetail();
  }, [loadDetail, visible]);

  const counts = useMemo(() => {
    const checkedIn = employees.filter((employee) => employee.checkedIn).length;

    return {
      all: employees.length,
      checkedIn,
      notCheckedIn: employees.length - checkedIn,
    };
  }, [employees]);

  const visibleEmployees = useMemo(
    () => filterAttendanceEmployees(employees, filterKey, searchQuery),
    [employees, filterKey, searchQuery],
  );

  const hasEmployees = employees.length > 0;
  const ratePercent = getHomeRatioPercent(counts.checkedIn, counts.all);
  const isSearching = searchQuery.trim().length > 0;

  return (
    <BottomSheetModalShell
      visible={visible}
      closeOnBackdropPress
      onClose={onClose}
      overlayStyle={styles.overlay}
      sheetStyle={[styles.sheet, { backgroundColor: colors.bg }]}
      closeButtonStyle={styles.closeButton}
      showCloseButton
      showHandle
      avoidKeyboard
    >
      <View style={styles.header}>
        <Text
          style={[styles.title, { color: colors.text }]}
          numberOfLines={2}
        >
          {department?.name ?? "Chi tiết điểm danh"}
        </Text>
        <Text
          style={[styles.subtitle, { color: colors.textSub }]}
        >
          {hasEmployees
            ? `${formatHomeNumber(counts.checkedIn)}/${formatHomeNumber(
                counts.all,
              )} đã điểm danh · ${formatHomePercent(
                ratePercent,
              )} · trong hôm nay`
            : "Điểm danh trong hôm nay"}
        </Text>
        <Text
          style={[styles.note, { color: colors.textMuted }]}
        >
          Tính theo lượt quẹt thẻ hôm nay. Không tính nhân viên đã nghỉ việc.
        </Text>
      </View>

      {/* Bộ phận lớn nhất gần 900 người nên ô tìm nhanh là phần bắt buộc. */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Tìm theo tên, mã, chức danh..."
        variant="plain"
        style={styles.searchSpacing}
      />

      <View style={styles.filters}>
        {FILTERS.map((filter) => {
          const isActive = filter.key === filterKey;

          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive
                    ? colors.accentLight
                    : colors.surface,
                  borderColor: isActive ? colors.accent : hairlineBorderColor,
                },
              ]}
              activeOpacity={0.75}
              onPress={() => setFilterKey(filter.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={filter.label}
            >
              <Text
                style={[
                  styles.filterLabel,
                  { color: isActive ? colors.accent : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {`${filter.label} (${formatHomeNumber(counts[filter.key])})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        // Sheet cao cố định nên truyền số hàng, không đo được như khung chờ cả màn.
        <RecordListSkeleton variant="row" lines={2} rows={6} />
      ) : errorMessage ? (
        <EmptyState
          iconName="cloud-offline-outline"
          title="Không lấy được danh sách"
          subtitle={errorMessage}
          actionLabel="Thử lại"
          onActionPress={loadDetail}
        />
      ) : (
        <FlatList
          data={visibleEmployees}
          keyExtractor={(item) => item.key}
          style={styles.listView}
          contentContainerStyle={[
            styles.listContent,
            visibleEmployees.length === 0 && styles.listContentEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <EmployeeRow employee={item} isFirst={index === 0} />
          )}
          ListEmptyComponent={
            <EmptyState
              iconName={isSearching ? "search-outline" : "people-outline"}
              title={
                isSearching
                  ? "Không tìm thấy nhân viên nào"
                  : "Không có nhân viên nào trong mục này"
              }
              subtitle={
                isSearching
                  ? "Thử tìm với từ khoá khác."
                  : "Đổi bộ lọc để xem các nhân viên còn lại."
              }
              fullHeight={false}
            />
          }
        />
      )}
    </BottomSheetModalShell>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(9, 17, 27, 0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      height: "86%",
    },
    closeButton: {
      top: 14,
      right: 14,
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    header: {
      marginTop: 2,
      marginBottom: 12,
      paddingHorizontal: 44,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      textAlign: "center",
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: 12,
      fontWeight: "600",
      textAlign: "center",
      marginTop: 3,
    },
    // Cùng cỡ với ghi chú cuối các card trên Trang chủ.
    note: {
      fontSize: 10.5,
      marginTop: 5,
      fontWeight: "600",
      textAlign: "center",
      color: c.textMuted,
    },
    searchSpacing: {
      marginBottom: 10,
    },
    filters: {
      flexDirection: "row",
      gap: 7,
      marginBottom: 12,
    },
    // Chip lọc cũng là nút bấm: cao tối thiểu 40pt, đừng để cỡ chữ quyết định.
    filterChip: {
      flex: 1,
      borderRadius: 999,
      minHeight: 40,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: "center",
      justifyContent: "center",
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: "700",
    },
    listView: { flex: 1 },
    listContent: { paddingBottom: 20 },
    listContentEmpty: { flexGrow: 1, justifyContent: "center" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: 52,
      paddingVertical: 10,
    },
    rowTextWrap: { flex: 1 },
    rowName: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    rowMeta: {
      fontSize: 12,
      marginTop: 2,
      fontWeight: "600",
      color: c.textSub,
    },
    rowStatus: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      minWidth: 76,
      justifyContent: "flex-end",
    },
    rowTime: {
      fontSize: 13.5,
      fontWeight: "800",
    },
  });
