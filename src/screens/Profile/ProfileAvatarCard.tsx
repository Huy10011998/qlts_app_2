import React, { useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import IsLoading from "../../components/ui/IconLoading";
import ImagePreviewModal from "../../components/ui/ImagePreviewModal";
import { update } from "../../services/data/assetApi";
import { useAppDispatch } from "../../store/hooks";
import { patchNhanVienInfo } from "../../store/NhanVienSlice";
import type { NhanVienInfo } from "../../types/model.d";
import { getApiErrorMessage } from "../../utils/helpers/api";
import { getBase64SizeKB, isDataUrlImage } from "../../utils/imageBase64";
import {
  pickImageBase64,
  recropImageBase64,
} from "../../utils/imageBase64Picker";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";

const AVATAR_SIZE = 96;

type Props = { user: NhanVienInfo };

/**
 * Ảnh đại diện trên màn Hồ sơ — cũng là ảnh của danh thiếp QR. `NhanVien.HinhAnh`
 * là field ảnh base64 (`typeProperty = 12`), chọn / cắt xong là lưu ngay.
 *
 * Lưu theo cách 5a của tài liệu BE: chỉ gửi `HinhAnh` kèm
 * `lstIncludeProperties` — update ghi đè MỌI cột bằng `Entity`, gửi thiếu là các
 * cột khác của nhân viên về NULL.
 */
export default function ProfileAvatarCard({ user }: Props) {
  const s = useStyles(makeStyles);
  const c = useAppColors();
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const current = isDataUrlImage(user.hinhAnh) ? user.hinhAnh : null;
  // Tài khoản chưa gán nhân viên thì không có dòng nào để lưu ảnh vào.
  const canEdit = user.id != null;

  const save = async (next: string | null) => {
    if (user.id == null) return;
    await update("NhanVien", {
      entity: { HinhAnh: next },
      iDs: [user.id],
      lstIncludeProperties: ["HinhAnh"],
      saveHistory: true,
    });
    dispatch(patchNhanVienInfo({ hinhAnh: next }));
  };

  const run = async (task: () => Promise<string | null | undefined>) => {
    if (busy) return;
    setBusy(true);
    try {
      // `undefined` = huỷ ở bước chọn / cắt: giữ nguyên ảnh cũ, không lưu gì.
      const next = await task();
      if (next !== undefined) await save(next);
    } catch (err) {
      Alert.alert(
        "Lỗi",
        getApiErrorMessage(err, "Không thể lưu ảnh đại diện. Vui lòng thử lại."),
      );
    } finally {
      setBusy(false);
    }
  };

  const pickThen = (picker: () => Promise<string | null>) => () =>
    run(async () => (await picker()) ?? undefined);

  const confirmRemove = () =>
    Alert.alert("Xoá ảnh đại diện", "Bạn chắc chắn muốn xoá ảnh đại diện?", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: () => run(async () => null),
      },
    ]);

  const actions = [
    {
      key: "camera",
      icon: "camera-outline",
      text: "Chụp ảnh",
      onPress: pickThen(() => pickImageBase64("camera")),
    },
    {
      key: "library",
      icon: "images-outline",
      text: "Thư viện",
      onPress: pickThen(() => pickImageBase64("library")),
    },
    {
      key: "recrop",
      icon: "crop-outline",
      text: "Cắt lại",
      disabled: !current,
      onPress: pickThen(() =>
        current ? recropImageBase64(current) : Promise.resolve(null),
      ),
    },
    {
      key: "remove",
      icon: "trash-outline",
      text: "Xoá",
      disabled: !current,
      onPress: confirmRemove,
    },
  ];

  return (
    <View style={s.wrap}>
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={!current}
        onPress={() => setPreviewUri(current)}
        accessibilityRole="imagebutton"
        accessibilityLabel="Xem ảnh đại diện"
        style={s.avatar}
      >
        {current ? (
          <Image source={{ uri: current }} style={s.avatarImage} />
        ) : (
          <Ionicons name="person" size={44} color={c.textMuted} />
        )}

        {busy ? (
          <View style={s.busyOverlay}>
            <IsLoading size="small" color="#fff" />
          </View>
        ) : null}
      </TouchableOpacity>

      <Text style={s.sizeText}>
        {current
          ? `Ảnh đã lưu (${getBase64SizeKB(current)} KB)`
          : "Chưa có ảnh đại diện"}
      </Text>

      {canEdit ? (
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
                accessibilityLabel={`${a.text} ảnh đại diện`}
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
      ) : null}

      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: { alignItems: "center", marginHorizontal: 16, marginBottom: 20 },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
      borderWidth: 2,
      borderColor: c.redBorder,
    },
    avatarImage: { width: "100%", height: "100%" },
    busyOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(17,24,39,0.45)",
    },
    sizeText: { marginTop: 8, fontSize: 12, color: c.textSub },
    actions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
      alignSelf: "stretch",
    },
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
  });
