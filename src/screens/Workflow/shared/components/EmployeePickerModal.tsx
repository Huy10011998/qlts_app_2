import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SearchBar from "../../../../components/ui/SearchBar";
import EmptyState from "../../../../components/ui/EmptyState";
import type { WorkflowEmployee } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { removeVietnameseTones } from "../../../../utils/helpers/string";
import WorkflowButton from "./WorkflowButton";

type Props = {
  visible: boolean;
  title: string;
  employees: WorkflowEmployee[];
  selectedIds: number[];
  /** false: chọn 1 người, bấm là xong. */
  multiple?: boolean;
  /** Chỉ cho chọn trong danh sách này (bước có luật người duyệt). null = mọi người. */
  allowedIds?: number[] | null;
  /** Không hiện (vd chủ trì của kế hoạch). */
  excludeIds?: number[];
  onClose: () => void;
  onConfirm: (ids: number[]) => void;
};

const getInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const last = words[words.length - 1][0] ?? "";
  const first = words.length > 1 ? words[0][0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
};

const searchText = (employee: WorkflowEmployee) =>
  removeVietnameseTones(
    [employee.ten, employee.ma, employee.phongBan, employee.chucVu, employee.chucDanh]
      .filter(Boolean)
      .join(" "),
  );

/**
 * Lưới chọn nhân viên: tìm không dấu theo tên / mã / phòng ban / chức vụ,
 * người đã chọn xếp lên đầu (theo lúc mở, để danh sách không nhảy khi đang
 * tích). Dùng cho chọn người duyệt, người tham gia công việc / kế hoạch.
 */
export default function EmployeePickerModal({
  visible,
  title,
  employees,
  selectedIds,
  multiple = true,
  allowedIds,
  excludeIds,
  onClose,
  onConfirm,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<number[]>(selectedIds);
  const [pinned, setPinned] = useState<Set<number>>(new Set(selectedIds));

  useEffect(() => {
    if (!visible) return;
    setKeyword("");
    setSelected(selectedIds);
    setPinned(new Set(selectedIds));
    // Chỉ lấy lựa chọn hiện có lúc MỞ; trong lúc mở danh sách tự quản.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const indexed = useMemo(() => {
    const allowed = allowedIds ? new Set(allowedIds) : null;
    const excluded = new Set(excludeIds ?? []);

    return employees
      .filter((employee) => !excluded.has(employee.id))
      .filter((employee) => !allowed || allowed.has(employee.id))
      .map((employee) => ({ employee, text: searchText(employee) }));
  }, [allowedIds, employees, excludeIds]);

  const data = useMemo(() => {
    const term = removeVietnameseTones(keyword.trim());
    const matched = term
      ? indexed.filter((row) => row.text.includes(term))
      : indexed;

    return matched
      .map((row, index) => ({ row, index }))
      .sort(
        (a, b) =>
          Number(pinned.has(b.row.employee.id)) -
            Number(pinned.has(a.row.employee.id)) || a.index - b.index,
      )
      .map(({ row }) => row.employee);
  }, [indexed, keyword, pinned]);

  const toggle = (id: number) => {
    if (!multiple) {
      onConfirm([id]);
      return;
    }

    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const renderItem = ({ item }: { item: WorkflowEmployee }) => {
    const checked = selected.includes(item.id);
    const meta = [item.ma, item.phongBan, item.chucVu || item.chucDanh]
      .filter(Boolean)
      .join(" · ");

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.row, checked && styles.rowChecked]}
        onPress={() => toggle(item.id)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.ten)}</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.name} numberOfLines={1}>
            {item.ten}
          </Text>
          {meta ? (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={
            checked
              ? multiple
                ? "checkbox"
                : "radio-button-on"
              : multiple
              ? "square-outline"
              : "radio-button-off"
          }
          size={22}
          color={checked ? c.red : c.textMuted}
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.headerButton} />
        </View>

        <SearchBar
          value={keyword}
          onChangeText={setKeyword}
          placeholder="Tìm tên, mã, phòng ban..."
          style={styles.search}
        />

        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          initialNumToRender={20}
          ListEmptyComponent={
            <EmptyState
              iconName="people-outline"
              title={keyword ? "Không tìm thấy nhân viên" : "Không có nhân viên để chọn"}
            />
          }
        />

        {multiple ? (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Text style={styles.footerText}>Đã chọn: {selected.length}</Text>
            <WorkflowButton
              label="Xong"
              icon="checkmark"
              onPress={() => onConfirm(selected)}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 8,
      backgroundColor: c.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },
    headerButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      flex: 1,
      textAlign: "center",
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
    search: {
      marginHorizontal: 12,
      marginTop: 10,
      marginBottom: 6,
    },
    listContent: {
      paddingHorizontal: 12,
      paddingBottom: 24,
      flexGrow: 1,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      marginTop: 6,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.surface,
    },
    rowChecked: {
      borderColor: c.redBorder,
      backgroundColor: c.redSurface,
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.accentLight,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    avatarText: {
      fontSize: 13,
      fontWeight: "700",
      color: c.accent,
    },
    rowBody: {
      flex: 1,
      marginRight: 8,
    },
    name: {
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
    },
    meta: {
      fontSize: 12,
      color: c.textSub,
      marginTop: 2,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 10,
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
    },
    footerText: {
      fontSize: 14,
      color: c.textSecondary,
      fontWeight: "600",
    },
  });
