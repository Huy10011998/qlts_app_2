import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import TextSizeSlider from "../../components/ui/TextSizeSlider";
import { useTextScale } from "../../context/FontScaleContext";
import { useColorScheme } from "../../hooks/useColorScheme";
import {
  getTextScaleFactorForStep,
  TEXT_SCALE_DEFAULT_STEP,
  TEXT_SCALE_STEPS,
} from "../../utils/helpers/textScaling";

/**
 * Cỡ chữ trong khối xem trước phải nhân tay theo nấc đang rê: hệ số toàn cục chỉ
 * đổi lúc nhấc tay (xem `handleChangeEnd`), nên trong lúc kéo thì lớp bọc `Text`
 * vẫn đang nhân theo hệ số cũ — chia lại `appliedFactor` để bù.
 */
const previewFontSize = (base: number, factor: number, appliedFactor: number) =>
  (base / appliedFactor) * factor;

/**
 * Bảng mẫu chữ: mỗi dòng tự gọi tên vai trò của nó và hiển thị đúng ở cỡ mà ứng
 * dụng dùng cho vai trò đó.
 *
 * Cố ý không dựng dữ liệu nghiệp vụ giả (một phiếu kiểm kê, một tên nhà máy):
 * trên màn Cài đặt, người dùng có lý do để tưởng đó là dữ liệu thật của mình.
 * Chữ ở đây nhiều dấu tiếng Việt để thấy ngay nếu cỡ lớn làm xén dấu.
 */
const SPECIMEN = [
  { text: "Tiêu đề màn hình", size: 20, weight: "700" as const },
  { text: "Tiêu đề mục", size: 14.5, weight: "600" as const },
  { text: "Nội dung thường trong ứng dụng", size: 13, weight: "400" as const },
  { text: "Chú thích nhỏ", size: 11.5, weight: "400" as const },
];

export default function TextSizeScreen() {
  const isDark = useColorScheme() === "dark";
  const { step, factor: appliedFactor, setStep } = useTextScale();
  const [previewStep, setPreviewStep] = React.useState(step);

  const colors = isDark
    ? {
        background: "#090D13",
        card: "#171D26",
        text: "#F5F7FB",
        secondary: "#9AA7B7",
        border: "#293442",
      }
    : {
        background: "#F2F4F8",
        card: "#FFFFFF",
        text: "#131A24",
        secondary: "#778393",
        border: "#E2E7EE",
      };

  const previewFactor = getTextScaleFactorForStep(previewStep);
  const scale = (base: number) =>
    previewFontSize(base, previewFactor, appliedFactor);
  // Hai chữ A hai đầu thanh trượt là nhãn mô tả hướng to–nhỏ, phải giữ nguyên
  // cỡ. Chia ngược hệ số đang áp dụng để bù lại phép nhân toàn cục.
  const fixed = (base: number) => base / appliedFactor;

  // Đang rê thì chỉ đổi phần xem trước — nhẹ và tức thì.
  const handleChange = setPreviewStep;

  /**
   * Nhấc tay mới áp dụng thật.
   *
   * `setStep` remount cả cây điều hướng để hệ số cỡ chữ mới có hiệu lực; làm
   * việc đó theo từng nấc trong lúc kéo thì cú kéo đứt ngay nấc đầu. Màn này
   * được dựng lại tại chỗ (`initialState` ở `App.tsx`), nên sau khi nhấc tay
   * người dùng vẫn đứng đây và thấy cả màn đổi cỡ, không riêng bảng mẫu chữ.
   */
  const handleChangeEnd = (nextStep: number) => {
    setPreviewStep(nextStep);
    setStep(nextStep);
  };

  const percentLabel = `${Math.round(previewFactor * 100)}%`;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/*
        Chính đoạn mô tả này là phần xem trước — giống màn Cỡ chữ của iOS. Không
        dựng thẻ dữ liệu mẫu: trên màn Cài đặt, một bản ghi giả trông như dữ liệu
        thật của người dùng.
      */}
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          style={[
            styles.intro,
            { color: colors.text, fontSize: scale(15) },
          ]}
        >
          Kéo thanh bên dưới để chọn cỡ chữ cho toàn bộ ứng dụng. Chữ trong đoạn
          này thay đổi theo lựa chọn của bạn.
        </Text>

        <Text
          style={[
            styles.introSub,
            { color: colors.secondary, fontSize: scale(13) },
          ]}
        >
          Cài đặt này nhân thêm vào cỡ chữ của thiết bị, nên vẫn có tác dụng kể
          cả khi máy đang để cỡ chữ mặc định.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
          MẪU CHỮ
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {SPECIMEN.map((row, index) => (
            <View
              key={row.text}
              style={[
                styles.specimenRow,
                index > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: scale(row.size),
                  fontWeight: row.weight,
                }}
              >
                {row.text}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <View
          style={[
            styles.card,
            styles.sliderCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            allowFontScaling={false}
            style={[
              styles.sizeHint,
              { color: colors.secondary, fontSize: fixed(13) },
            ]}
          >
            A
          </Text>
          <View style={styles.sliderWrap}>
            <TextSizeSlider
              accessibilityLabel="Cỡ chữ"
              stepCount={TEXT_SCALE_STEPS.length}
              value={previewStep}
              onChange={handleChange}
              onChangeEnd={handleChangeEnd}
            />
          </View>
          <Text
            allowFontScaling={false}
            style={[
              styles.sizeHint,
              { color: colors.secondary, fontSize: fixed(24) },
            ]}
          >
            A
          </Text>
        </View>

        <Text style={[styles.footnote, { color: colors.secondary }]}>
          {previewStep === TEXT_SCALE_DEFAULT_STEP
            ? `${percentLabel} • cỡ mặc định`
            : percentLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: 24, paddingBottom: 24 },
  intro: {
    marginHorizontal: 24,
    textAlign: "center",
  },
  introSub: {
    marginTop: 16,
    marginHorizontal: 24,
    textAlign: "center",
  },
  sectionTitle: {
    marginTop: 28,
    marginBottom: 10,
    marginHorizontal: 20,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  specimenRow: {
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  bottom: { paddingBottom: 20 },
  sliderCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  sliderWrap: { flex: 1, marginHorizontal: 14 },
  sizeHint: { fontWeight: "600" },
  footnote: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 12.5,
  },
});
