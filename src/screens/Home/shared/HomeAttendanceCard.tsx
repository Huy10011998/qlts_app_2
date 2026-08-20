import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import EnumAndReferencePickerModal from "../../../components/modal/EnumAndReferencePickerModal";
import {
  AppColors,
  C,
  useAppColors,
  useHairlineBorderColor,
  useSeparatorColor,
  useStyles,
} from "../../../utils/helpers/colors";
import HomeAttendanceDetailSheet from "./HomeAttendanceDetailSheet";
import type { HomeDashboardDepartment } from "./homeData";
import {
  formatHomeCount,
  formatHomeNumber,
  formatHomePercent,
  getHomeRatioPercent,
} from "./homeFormat";

type HomeAttendanceCardProps = {
  /** null = không kết nối được hệ thống nhân sự Bravo8. */
  total: number | null;
  checkedIn: number | null;
  notCheckedIn: number | null;
  /** Giữ nguyên thứ tự nhận được từ API (đã sắp theo sttPrintRep). */
  departments: HomeDashboardDepartment[];
  isLoading?: boolean;
};

/**
 * Modal dùng chung coi value rỗng là dòng "bỏ chọn" (in mờ, không tick, không
 * tính vào số đã tải), nên "Tất cả bộ phận" mang đúng value rỗng.
 */
const ALL_DEPARTMENTS_KEY = "";
const ALL_DEPARTMENTS_LABEL = "Tất cả bộ phận";

function AttendanceStat({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.stat, { backgroundColor: bg, borderColor: color }]}>
      <Text
        style={[styles.statValue, { color }]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text
        style={[styles.statLabel, { color }]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * Điểm danh của NGÀY HIỆN TẠI (từ 00:00), số lấy qua Bravo8.
 *
 * Combobox bộ phận lọc ngay tại máy: API đã trả sẵn số của tất cả bộ phận trong
 * cùng một response, đổi bộ phận KHÔNG gọi lại API. Danh sách bên dưới cũng tôn
 * trọng combobox — chọn một bộ phận thì chỉ còn dòng đó, để combobox và danh
 * sách không nói hai con số khác nhau.
 *
 * Con số tổng dễ gây hiểu nhầm (20,5% toàn công ty nghe như cả công ty chưa ai
 * quẹt thẻ, thực chất là hai xưởng lớn chưa quẹt trong khi các phòng đạt ~70%),
 * nên danh sách theo bộ phận là phần bắt buộc chứ không phải trang trí.
 */
export default function HomeAttendanceCard({
  total,
  checkedIn,
  notCheckedIn,
  departments,
  isLoading = false,
}: HomeAttendanceCardProps) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const separatorColor = useSeparatorColor();
  const [selectedKey, setSelectedKey] = useState(ALL_DEPARTMENTS_KEY);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  // Bộ phận đang xem chi tiết. Giữ lại cả trong lúc sheet trượt ra (chỉ tắt cờ
  // `isDetailOpen`) để tiêu đề sheet không đổi thành chữ mặc định giữa chừng.
  const [detailDepartment, setDetailDepartment] =
    useState<HomeDashboardDepartment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const openDetail = (dept: HomeDashboardDepartment) => {
    setDetailDepartment(dept);
    setIsDetailOpen(true);
  };

  // API trả sẵn số của tất cả bộ phận trong cùng response nên lọc ngay tại máy —
  // ô tìm kiếm của modal dùng chung không kéo theo lượt gọi nào.
  const pickerItems = useMemo(() => {
    const keyword = pickerSearch.trim().toLocaleLowerCase("vi");
    const matchedItems = departments
      .map((dept) => ({
        value: dept.key,
        text: `${dept.name} (${formatHomeNumber(dept.total)} người)`,
      }))
      .filter(
        (item) =>
          !keyword || item.text.toLocaleLowerCase("vi").includes(keyword),
      );

    // Đang tìm kiếm thì bỏ dòng "Tất cả" đi cho khỏi lẫn vào kết quả.
    return keyword
      ? matchedItems
      : [
          { value: ALL_DEPARTMENTS_KEY, text: ALL_DEPARTMENTS_LABEL },
          ...matchedItems,
        ];
  }, [departments, pickerSearch]);
  const pickerCount = pickerItems.filter(
    (item) => item.value !== ALL_DEPARTMENTS_KEY,
  ).length;
  const closePicker = () => {
    setIsPickerOpen(false);
    setPickerSearch("");
  };

  const selectedDepartment = useMemo(
    () => departments.find((dept) => dept.key === selectedKey) ?? null,
    [departments, selectedKey],
  );
  // Chọn "Tất cả" thì dùng bộ số ngoài; chọn một bộ phận thì dùng số của phần tử
  // đó. Hai bộ số này luôn khớp nhau vì cùng một truy vấn.
  const scope = selectedDepartment
    ? {
        total: selectedDepartment.total,
        checkedIn: selectedDepartment.checkedIn,
        notCheckedIn: selectedDepartment.notCheckedIn,
      }
    : { total, checkedIn, notCheckedIn };
  const ratePercent = getHomeRatioPercent(scope.checkedIn, scope.total);
  const visibleDepartments = selectedDepartment
    ? [selectedDepartment]
    : departments;
  const hasDepartments = departments.length > 0;
  // tongNhanVien = null nghĩa là mất kết nối Bravo8, không phải "0 nhân sự".
  const hasAttendanceData = total != null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: hairlineBorderColor,
          shadowColor: colors.shadow,
        },
      ]}
    >
      {/* Mảng bộ phận rỗng thì ẩn luôn combobox — không có gì để lọc. */}
      {hasDepartments ? (
        <TouchableOpacity
          style={[
            styles.picker,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: hairlineBorderColor,
            },
          ]}
          activeOpacity={0.78}
          onPress={() => setIsPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Bộ phận: ${
            selectedDepartment?.name ?? ALL_DEPARTMENTS_LABEL
          }`}
        >
          <Ionicons
            name="business-outline"
            size={15}
            color={colors.textMuted}
          />
          <Text
            style={[styles.pickerText, { color: colors.text }]}
            numberOfLines={1}
          >
            {selectedDepartment?.name ?? ALL_DEPARTMENTS_LABEL}
          </Text>
          <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}

      {hasAttendanceData ? (
        <>
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {`${formatHomePercent(ratePercent)} đã điểm danh`}
          </Text>
          <Text
            style={[styles.headerNote, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {`${formatHomeCount(scope.checkedIn)} / ${formatHomeCount(
              scope.total,
            )} người · trong hôm nay`}
          </Text>

          {/* Vạch hai màu: xanh = đã điểm danh, cam nhạt = chưa. */}
          <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
            <View
              style={[
                styles.trackFill,
                {
                  backgroundColor: isLoading ? colors.border : C.emerald,
                  width: `${isLoading ? 0 : ratePercent ?? 0}%`,
                },
              ]}
            />
            <View
              style={[
                styles.trackFill,
                {
                  backgroundColor: isLoading ? colors.border : C.amber,
                  width: `${isLoading ? 0 : 100 - (ratePercent ?? 0)}%`,
                },
              ]}
            />
          </View>

          <View style={styles.stats}>
            <AttendanceStat
              label="Đang làm việc"
              value={formatHomeCount(scope.total)}
              color={colors.textSecondary}
              bg={colors.surfaceAlt}
            />
            <AttendanceStat
              label="Đã điểm danh"
              value={formatHomeCount(scope.checkedIn)}
              color={C.emerald}
              bg={colors.greenLight}
            />
            <AttendanceStat
              label="Chưa điểm danh"
              value={formatHomeCount(scope.notCheckedIn)}
              color={C.amber}
              bg={colors.amberLight}
            />
          </View>

          {visibleDepartments.length > 0 ? (
            <View style={[styles.deptList, { borderTopColor: separatorColor }]}>
              {visibleDepartments.map((dept, index) => {
                const deptPercent = getHomeRatioPercent(
                  dept.checkedIn,
                  dept.total,
                );
                // Endpoint chi tiết nhận deptCode, nên dòng "Chưa gán bộ phận"
                // (code null) không mở được — để nguyên, đừng gọi API với mã rỗng.
                const canOpenDetail = Boolean(dept.code);

                return (
                  <TouchableOpacity
                    key={dept.key}
                    style={[
                      styles.deptRow,
                      // Các dòng nay dính sát nhau (khoảng cách nằm trong vùng
                      // chạm), nên cần vạch mảnh để không đọc lẫn dòng.
                      index > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: separatorColor,
                      },
                    ]}
                    activeOpacity={canOpenDetail ? 0.6 : 1}
                    disabled={!canOpenDetail}
                    onPress={() => openDetail(dept)}
                    accessibilityRole={canOpenDetail ? "button" : undefined}
                    accessibilityLabel={
                      canOpenDetail
                        ? `Xem chi tiết điểm danh ${dept.name}`
                        : undefined
                    }
                  >
                    <Text
                      style={[styles.deptName, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {dept.name}
                    </Text>
                    <Text
                      style={[styles.deptCount, { color: colors.text }]}
                    >
                      {`${formatHomeNumber(dept.checkedIn)}/${formatHomeNumber(
                        dept.total,
                      )}`}
                    </Text>
                    <View
                      style={[
                        styles.deptTrack,
                        { backgroundColor: colors.surfaceAlt },
                      ]}
                    >
                      <View
                        style={[
                          styles.trackFill,
                          {
                            backgroundColor: C.emerald,
                            width: `${deptPercent ?? 0}%`,
                          },
                        ]}
                      />
                    </View>
                    {/* Mũi tên là chỗ duy nhất cho biết dòng bấm được — không có
                        nó thì không ai nghĩ ra là chạm vào xem được danh sách. */}
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={canOpenDetail ? colors.textMuted : "transparent"}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {/* Phạm vi số liệu: SQL đã lọc sẵn, nhưng không ghi ra thì người xem
              đem so với báo cáo nhân sự toàn công ty rồi báo lệch. */}
          <Text
            style={[styles.note, { color: colors.textMuted }]}
          >
            Tính theo lượt quẹt thẻ hôm nay. Không tính nhân viên đã nghỉ việc.
          </Text>
        </>
      ) : (
        <Text
          style={[styles.errorNote, { color: colors.textSecondary }]}
        >
          Chưa lấy được dữ liệu điểm danh (không kết nối được hệ thống nhân sự
          Bravo8).
        </Text>
      )}

      <EnumAndReferencePickerModal
        visible={isPickerOpen}
        title="Chọn bộ phận"
        items={pickerItems}
        selectedValue={selectedKey}
        total={pickerCount}
        loadedCount={pickerCount}
        onSearch={setPickerSearch}
        onClose={closePicker}
        onSelect={(value) => {
          // Chọn dòng "Tất cả bộ phận" (value rỗng) là quay về bộ số toàn công ty.
          setSelectedKey(String(value ?? ALL_DEPARTMENTS_KEY));
          closePicker();
        }}
      />

      <HomeAttendanceDetailSheet
        visible={isDetailOpen}
        department={detailDepartment}
        onClose={() => setIsDetailOpen(false)}
      />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 14,
      shadowColor: c.shadow,
      shadowOpacity: 0.07,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    picker: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 12,
      paddingHorizontal: 11,
      paddingVertical: 9,
      // Cùng mức 44pt với dòng bộ phận bên dưới: cả hai đều là chỗ bấm.
      minHeight: 44,
      marginBottom: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
    },
    pickerText: {
      flex: 1,
      fontSize: 12.5,
      fontWeight: "700",
      color: c.text,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: -0.3,
      color: c.text,
    },
    headerNote: {
      fontSize: 11,
      marginTop: 3,
      fontWeight: "600",
      color: c.textMuted,
    },
    track: {
      flexDirection: "row",
      height: 7,
      borderRadius: 4,
      overflow: "hidden",
      marginTop: 11,
      backgroundColor: c.surfaceAlt,
    },
    trackFill: {
      height: "100%",
    },
    stats: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    stat: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 9,
      paddingHorizontal: 9,
      borderWidth: 1,
      borderColor: "transparent",
    },
    statValue: {
      fontSize: 17,
      fontWeight: "800",
      letterSpacing: -0.4,
    },
    statLabel: {
      fontSize: 10.5,
      marginTop: 2,
      fontWeight: "700",
    },
    deptList: {
      marginTop: 12,
      paddingTop: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    // Dòng bấm được nên chiều cao do vùng chạm quyết định (44pt là mức tối thiểu
    // cho đầu ngón tay), không phải do cỡ chữ. Khoảng cách giữa các dòng nằm
    // trong `paddingVertical` luôn, để phần đệm cũng bấm trúng.
    deptRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 44,
      paddingVertical: 6,
    },
    deptName: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
    },
    deptCount: {
      width: 80,
      textAlign: "right",
      fontSize: 14,
      fontWeight: "800",
      color: c.text,
    },
    deptTrack: {
      width: 48,
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
      backgroundColor: c.surfaceAlt,
    },
    // Cùng cỡ với ghi chú cuối các card cơ cấu / tiêu thụ, để mọi chú thích trên
    // Trang chủ đọc như một loại chữ.
    note: {
      fontSize: 10.5,
      marginTop: 10,
      fontWeight: "600",
      color: c.textMuted,
    },
    errorNote: {
      fontSize: 12.5,
      fontWeight: "600",
      color: c.textSecondary,
    },
  });
