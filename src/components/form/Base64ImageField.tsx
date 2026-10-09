import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { Field } from "../../types/model.d";
import { getBase64SizeKB, isDataUrlImage } from "../../utils/imageBase64";
import {
  pickImageBase64,
  recropImageBase64,
} from "../../utils/imageBase64Picker";
import {
  clearFormImageTouched,
  getFormImageOriginal,
  isFormImageTouched,
  markFormImageTouched,
  trackFormImageOriginal,
} from "../../utils/formImageOriginals";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import Base64ImageThumb from "../ui/Base64ImageThumb";

type Props = {
  field: Field;
  value: unknown;
  onChange: (fieldName: string, value: string | null) => void;
  hasValidationError?: boolean;
};

/**
 * Ô nhập của field `typeProperty = 12` (ảnh lưu thẳng trong cột), bố cục theo
 * `LabelWithImageBase64.razor` của web: ảnh nhỏ + "Ảnh đã lưu (xx KB)" + các nút
 * Chọn ảnh · Cắt lại · Xoá. Ảnh nằm ngay trong form — lưu form là lưu ảnh,
 * không có bước upload riêng.
 */
export default function Base64ImageField({
  field,
  value,
  onChange,
  hasValidationError,
}: Props) {
  const s = useStyles(makeStyles);
  const c = useAppColors();
  const [busy, setBusy] = useState(false);
  const [touched, setTouchedState] = useState(() =>
    isFormImageTouched(field.name),
  );

  const label = field.moTa ?? field.name;
  const current = isDataUrlImage(value) ? value : null;

  /* Mốc ảnh gốc cho nút hoàn tác. Khác field ảnh thường: giá trị có sẵn ngay
     trong dòng nên mốc chốt được luôn, kể cả "chưa có ảnh". */
  useEffect(() => {
    if (touched) return;
    trackFormImageOriginal(field.name, { preview: current ?? "", value: current });
  }, [current, field.name, touched]);

  const setTouched = (next: boolean) => {
    if (next) markFormImageTouched(field.name);
    else clearFormImageTouched(field.name);
    setTouchedState(next);
  };

  const apply = (next: string | null) => {
    setTouched(true);
    onChange(field.name, next);
  };

  const run = async (task: () => Promise<string | null>) => {
    if (busy) return;
    setBusy(true);
    try {
      // Huỷ ở bước chọn / cắt thì `null` — giữ nguyên ảnh cũ.
      const next = await task();
      if (next) apply(next);
    } finally {
      setBusy(false);
    }
  };

  const original = getFormImageOriginal(field.name);
  const canUndo = Boolean(
    touched && original && (original.value ?? null) !== current,
  );

  const undo = () => {
    if (!original) return;
    onChange(field.name, original.value ?? null);
    setTouched(false);
  };

  const actions: Array<{
    key: string;
    icon: string;
    text: string;
    onPress: () => void;
    disabled?: boolean;
  }> = [
    {
      key: "camera",
      icon: "camera-outline",
      text: "Chụp ảnh",
      onPress: () => run(() => pickImageBase64("camera")),
    },
    {
      key: "library",
      icon: "images-outline",
      text: "Thư viện",
      onPress: () => run(() => pickImageBase64("library")),
    },
    {
      key: "recrop",
      icon: "crop-outline",
      text: "Cắt lại",
      disabled: !current,
      onPress: () => current && run(() => recropImageBase64(current)),
    },
    {
      key: "remove",
      icon: "trash-outline",
      text: "Xoá",
      disabled: !current,
      onPress: () => apply(null),
    },
  ];

  return (
    <View style={s.wrap}>
      <View style={[s.summary, hasValidationError && s.summaryInvalid]}>
        <Base64ImageThumb
          value={current}
          size={64}
          accessibilityLabel={`Xem ${label}`}
        />
        <Text style={s.sizeText}>
          {current
            ? `Ảnh đã lưu (${getBase64SizeKB(current)} KB)`
            : "Chưa có ảnh"}
        </Text>
      </View>

      <View style={s.actions}>
        {actions.map((a) => {
          const disabled = busy || a.disabled;
          return (
            <TouchableOpacity
              key={a.key}
              style={[s.action, disabled && s.actionDisabled]}
              onPress={a.onPress}
              disabled={disabled}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${a.text} ${label}`}
              accessibilityState={{ disabled }}
            >
              <Ionicons name={a.icon} size={16} color={c.red} />
              <Text style={s.actionText} numberOfLines={1}>
                {a.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {canUndo ? (
        <TouchableOpacity
          style={s.undoRow}
          onPress={undo}
          accessibilityRole="button"
          accessibilityLabel={`Hoàn tác ${label} về ảnh gốc`}
        >
          <Ionicons name="arrow-undo-outline" size={14} color={c.textSub} />
          <Text style={s.undoText}>Hoàn tác về ảnh gốc</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: { marginTop: 6 },
    summary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    summaryInvalid: { borderColor: c.red, backgroundColor: c.redSurface },
    sizeText: { flex: 1, fontSize: 13, color: c.textSub },
    actions: { flexDirection: "row", gap: 8, marginTop: 8 },
    action: {
      flex: 1,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      paddingHorizontal: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.redBorder,
      backgroundColor: c.surface,
    },
    actionDisabled: { opacity: 0.4 },
    actionText: { fontSize: 11.5, fontWeight: "600", color: c.red },
    undoRow: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 5,
      marginTop: 8,
      paddingVertical: 4,
    },
    undoText: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textSub,
      textDecorationLine: "underline",
    },
  });
