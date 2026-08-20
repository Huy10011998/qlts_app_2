import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  StyleProp,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

type AssetFormHeaderSubmitButtonProps = {
  iconName: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const createAssetFormHeaderSubmitRight =
  (props: AssetFormHeaderSubmitButtonProps) => () =>
    <AssetFormHeaderSubmitButton {...props} />;

export default function AssetFormHeaderSubmitButton({
  iconName,
  label,
  onPress,
  disabled = false,
  style,
}: AssetFormHeaderSubmitButtonProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  return (
    // Pressable + style theo `pressed`, KHÔNG dùng TouchableOpacity: nút này bấm
    // là điều hướng (Sửa mở màn sửa, Lưu quay về danh sách). TouchableOpacity mờ
    // đi bằng animation opacity và phải có thêm mấy frame nữa mới sáng lại; đúng
    // lúc đó JS thread đang dựng màn mới nên animation bị bỏ dở, nút đứng ở mức
    // mờ trông như bị disable, tới lúc back ra mới sáng lên. Đổi mờ/sáng thành
    // một lần render thì không còn gì để bỏ dở.
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={iconName} size={16} color={c.red} />
      <Text
        style={styles.label}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    button: {
      minHeight: 34,
      borderRadius: 999,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.7)",
    },
    buttonPressed: {
      opacity: 0.78,
    },
    buttonDisabled: {
      opacity: 0.55,
    },
    label: {
      color: c.red,
      fontSize: 12,
      fontWeight: "800",
    },
  });
