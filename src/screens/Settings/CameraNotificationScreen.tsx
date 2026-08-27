import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import EmptyState from "../../components/ui/EmptyState";
import { CameraNotiPhamVi } from "../../services/notifications/cameraNotiApi";
import { C, useAppColors } from "../../utils/helpers/colors";
import { useCameraNotiTamDung } from "./shared/useCameraNotiTamDung";

/**
 * Các mốc tạm dừng cố định.
 *
 * Cố ý KHÔNG cho nhập số phút tự do: server không chặn trần thời gian, gõ 99999
 * phút là tắt gần như vĩnh viễn mà không ai biết.
 */
const MOC_TAM_DUNG = [
  { label: "15 phút", soPhut: 15 },
  { label: "30 phút", soPhut: 30 },
  { label: "1 giờ", soPhut: 60 },
  { label: "4 giờ", soPhut: 240 },
];

const MAX_LY_DO = 500;

const formatConLai = (soPhut: number) => {
  if (soPhut <= 0) return "sắp hết";
  if (soPhut < 60) return `còn ${soPhut} phút`;

  const gio = Math.floor(soPhut / 60);
  const phut = soPhut % 60;

  return phut === 0 ? `còn ${gio} giờ` : `còn ${gio} giờ ${phut} phút`;
};

export default function CameraNotificationScreen() {
  const colors = useAppColors();
  const {
    lenhChinh,
    dangTamDung,
    thieuQuyen,
    dangTai,
    dangGui,
    loi,
    taiTrangThai,
    tamDung,
    huyTamDung,
  } = useCameraNotiTamDung();

  const [lyDo, setLyDo] = useState("");
  const [soPhutConLai, setSoPhutConLai] = useState<number | null>(null);

  // Đếm ngược tại chỗ từ số phút SERVER trả về, đo bằng khoảng thời gian đã trôi
  // chứ không đọc giờ tuyệt đối của máy — giờ điện thoại hay lệch so với server.
  const mocDemNguocRef = useRef<{ batDau: number; soPhut: number } | null>(null);

  useEffect(() => {
    if (!lenhChinh) {
      mocDemNguocRef.current = null;
      setSoPhutConLai(null);
      return;
    }

    mocDemNguocRef.current = {
      batDau: Date.now(),
      soPhut: lenhChinh.soPhutConLai,
    };
    setSoPhutConLai(lenhChinh.soPhutConLai);

    const timer = setInterval(() => {
      const moc = mocDemNguocRef.current;
      if (!moc) return;

      const daTroiPhut = Math.floor((Date.now() - moc.batDau) / 60_000);
      const conLai = Math.max(0, moc.soPhut - daTroiPhut);

      setSoPhutConLai(conLai);

      // Hết giờ: hỏi lại server thay vì tự chuyển sang "đang nhận" — có thể còn
      // lệnh khác chồng lên (ví dụ lệnh toàn cục do người khác tạo).
      if (conLai === 0) taiTrangThai();
    }, 30_000);

    return () => clearInterval(timer);
  }, [lenhChinh, taiTrangThai]);

  const handleTamDung = useCallback(
    async (soPhut: number) => {
      if (dangGui) return;

      const ok = await tamDung({
        soPhut,
        phamVi: CameraNotiPhamVi.ChiToi,
        lyDo,
      });

      if (ok) setLyDo("");
    },
    [dangGui, lyDo, tamDung],
  );

  const handleTamDungToanCongTy = useCallback(
    (soPhut: number) => {
      if (dangGui) return;

      Alert.alert(
        "Tắt thông báo cả công ty?",
        `Trong ${formatConLai(soPhut).replace(
          "còn ",
          "",
        )} tới, MỌI NGƯỜI sẽ không nhận được thông báo camera, không riêng bạn.`,
        [
          { text: "Huỷ", style: "cancel" },
          {
            text: "Tắt cả công ty",
            style: "destructive",
            onPress: async () => {
              const ok = await tamDung({
                soPhut,
                phamVi: CameraNotiPhamVi.MoiNguoi,
                lyDo,
              });

              if (ok) setLyDo("");
            },
          },
        ],
      );
    },
    [dangGui, lyDo, tamDung],
  );

  const handleBatLai = useCallback(() => {
    if (dangGui || !lenhChinh) return;

    // Lệnh toàn cục do người khác tạo: bỏ trống ID chỉ huỷ lệnh của chính mình,
    // nên phải truyền đúng ID — và hỏi xác nhận vì nó ảnh hưởng mọi người.
    const laLenhNguoiKhac = lenhChinh.iD_User === null;

    if (!laLenhNguoiKhac) {
      huyTamDung(lenhChinh.id);
      return;
    }

    Alert.alert(
      "Bật lại cho cả công ty?",
      `Lệnh này do ${
        lenhChinh.iD_User_Tao_MoTa ?? "người khác"
      } tạo và đang áp dụng cho mọi người. Bật lại sẽ khôi phục thông báo cho tất cả.`,
      [
        { text: "Huỷ", style: "cancel" },
        { text: "Bật lại", onPress: () => huyTamDung(lenhChinh.id) },
      ],
    );
  }, [dangGui, huyTamDung, lenhChinh]);

  if (thieuQuyen) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <EmptyState
          iconName="lock-closed-outline"
          title="Chưa có quyền"
          subtitle="Tài khoản của bạn chưa được cấp quyền nhận thông báo camera. Liên hệ bộ phận IT để được thêm quyền."
        />
      </View>
    );
  }

  if (dangTai && !lenhChinh) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={C.red} />
      </View>
    );
  }

  const phamViLabel = lenhChinh?.iD_Camera_MoTa
    ? `Camera ${lenhChinh.iD_Camera_MoTa}`
    : "Tất cả camera";

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={dangTai} onRefresh={taiTrangThai} />
      }
    >
      {loi ? (
        <View style={[styles.errorBox, { backgroundColor: colors.redSurface }]}>
          <Ionicons name="alert-circle-outline" size={18} color={C.red} />
          <Text style={[styles.errorText, { color: colors.text }]}>{loi}</Text>
        </View>
      ) : null}

      {/* ─── TRẠNG THÁI ─────────────────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.textSub }]}>
        TRẠNG THÁI
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: dangTamDung ? C.amber : C.emerald },
            ]}
          />
          <Text style={[styles.statusLabel, { color: colors.text }]}>
            {dangTamDung ? "Tạm dừng" : "Đang nhận thông báo"}
          </Text>
          {dangTamDung && soPhutConLai !== null ? (
            <Text style={[styles.statusCount, { color: colors.textSecondary }]}>
              {formatConLai(soPhutConLai)}
            </Text>
          ) : null}
        </View>

        {dangTamDung && lenhChinh ? (
          <View style={styles.statusDetails}>
            <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
              Phạm vi: {phamViLabel}
              {lenhChinh.iD_User === null ? " • cả công ty" : ""}
            </Text>
            <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
              Người tắt: {lenhChinh.iD_User_Tao_MoTa ?? "—"}
            </Text>
            {lenhChinh.lyDo ? (
              <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
                Lý do: {lenhChinh.lyDo}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, dangGui && styles.buttonDisabled]}
              disabled={dangGui}
              onPress={handleBatLai}
              activeOpacity={0.85}
            >
              {dangGui ? (
                <ActivityIndicator color={C.onBrand} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Bật lại ngay</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* ─── TẠM DỪNG ───────────────────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.textSub }]}>
        TẠM DỪNG NHẬN THÔNG BÁO
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.chipRow}>
          {MOC_TAM_DUNG.map((moc) => (
            <TouchableOpacity
              key={moc.soPhut}
              style={[
                styles.chip,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.borderStrong,
                },
                dangGui && styles.buttonDisabled,
              ]}
              disabled={dangGui}
              onPress={() => handleTamDung(moc.soPhut)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, { color: colors.text }]}>
                {moc.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.inputLabel, { color: colors.textSub }]}>
          Lý do (nên điền, để sau này tra lại ai tắt)
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.input,
              borderColor: colors.borderStrong,
              color: colors.text,
            },
          ]}
          value={lyDo}
          onChangeText={setLyDo}
          maxLength={MAX_LY_DO}
          placeholder="Ví dụ: Đang thi công kho"
          placeholderTextColor={colors.placeholder}
          multiline
        />
      </View>

      {/* ─── PHẠM VI TOÀN CÔNG TY ───────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.textSub }]}>
        TẮT CHO CẢ CÔNG TY
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.redBorder },
        ]}
      >
        <Text style={[styles.warningText, { color: colors.textSecondary }]}>
          Mọi người trong công ty sẽ không nhận được thông báo camera trong
          khoảng thời gian bạn chọn. Chỉ dùng khi thực sự cần.
        </Text>
        <View style={styles.chipRow}>
          {MOC_TAM_DUNG.map((moc) => (
            <TouchableOpacity
              key={`all-${moc.soPhut}`}
              style={[
                styles.chip,
                styles.chipDanger,
                { backgroundColor: colors.redSurface },
                dangGui && styles.buttonDisabled,
              ]}
              disabled={dangGui}
              onPress={() => handleTamDungToanCongTy(moc.soPhut)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, styles.chipDangerText]}>
                {moc.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  errorBox: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    padding: 12,
  },
  errorText: { flex: 1, fontSize: 13 },
  statusRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  statusDot: { borderRadius: 5, height: 10, width: 10 },
  statusLabel: { flex: 1, fontSize: 16, fontWeight: "700" },
  statusCount: { fontSize: 13, fontWeight: "600" },
  statusDetails: { gap: 6, marginTop: 12 },
  detailLine: { fontSize: 13, lineHeight: 19 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: C.red,
    borderRadius: 10,
    marginTop: 10,
    paddingVertical: 12,
  },
  primaryButtonText: { color: C.onBrand, fontSize: 15, fontWeight: "700" },
  buttonDisabled: { opacity: 0.5 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chipText: { fontSize: 15, fontWeight: "600", textAlign: "center" },
  chipDanger: { borderColor: C.red },
  chipDangerText: { color: C.red },
  inputLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 16 },
  input: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 14,
    minHeight: 72,
    padding: 12,
    textAlignVertical: "top",
  },
  warningText: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
});
