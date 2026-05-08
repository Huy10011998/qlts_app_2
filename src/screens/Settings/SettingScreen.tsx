import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  TextInput,
  Switch,
  Platform,
  Dimensions,
  StatusBar,
} from "react-native";
import * as Keychain from "react-native-keychain";
import DeviceInfo from "react-native-device-info";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "../../context/AuthContext";
import IsLoading from "../../components/ui/IconLoading";
import { changePasswordApi } from "../../services/Index";
import { API_ENDPOINTS } from "../../config/Index";
import { StackNavigation, UserInfo } from "../../types";
import {
  callApi,
  clearTokenStorage,
  hardResetApi,
  resetAuthState,
} from "../../services/data/CallApi";
import ReactNativeBiometrics from "react-native-biometrics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearPermissions } from "../../store/PermissionSlice";
import { useAppDispatch } from "../../store/Hooks";
import {
  AUTH_LOGIN_SERVICE,
  FACE_ID_ENABLED_KEY,
  FACE_ID_LOGIN_SERVICE,
} from "../../constants/AuthStorage";
import { C } from "../../utils/Helper";

// ─── Color System ─────────────────────────────────────────────────────────────

const { width: W } = Dimensions.get("window");

// ─── Wave Divider ─────────────────────────────────────────────────────────────
const WaveDivider: React.FC = () => (
  <View style={{ height: 56, backgroundColor: C.red }}>
    <Svg
      width={W}
      height={56}
      viewBox={`0 0 ${W} 56`}
      style={{ position: "absolute", bottom: 0 }}
    >
      <Path
        d={`M0,14 C${W * 0.15},42 ${W * 0.35},0 ${W * 0.5},22 C${W * 0.65},44 ${
          W * 0.82
        },6 ${W},28 L${W},56 L0,56 Z`}
        fill={C.bg}
      />
    </Svg>
  </View>
);

// ─── Profile Header ───────────────────────────────────────────────────────────
const SettingHeader: React.FC<{
  name?: string;
  avatarUrl?: string;
  safeTop?: number;
}> = ({ name, avatarUrl, safeTop = 44 }) => {
  const initials = name
    ? name
        .split(" ")
        .slice(-2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <View style={[hStyles.container, { paddingTop: safeTop + 8 }]}>
      {/* Decorative circles for depth */}
      <View style={hStyles.deco1} />
      <View style={hStyles.deco2} />

      {/* Avatar */}
      <View style={hStyles.avatarShadowWrap}>
        <View style={hStyles.avatarRing}>
          <View style={hStyles.avatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={hStyles.avatarImage} />
            ) : (
              <LinearGradient
                colors={[C.redLight, C.redDeep]}
                style={hStyles.initialsGradient}
              >
                <Text style={hStyles.initials}>{initials}</Text>
              </LinearGradient>
            )}
          </View>
        </View>
      </View>

      {/* Text */}
      <Text style={hStyles.name}>{name || "---"}</Text>
      <View style={hStyles.badgeRow}>
        <View style={hStyles.badge}>
          <Ionicons
            name="shield-checkmark"
            size={10}
            color="rgba(255,255,255,0.85)"
            style={{ marginRight: 4 }}
          />
          <Text style={hStyles.badgeText}>Thành viên</Text>
        </View>
      </View>
    </View>
  );
};

const hStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    // paddingTop injected inline via safeTop prop
    paddingBottom: 20,
    overflow: "hidden",
  },
  deco1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -60,
    left: -40,
  },
  deco2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: 20,
    right: -20,
  },
  avatarShadowWrap: {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    marginBottom: 14,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  initialsGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
  },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  name: {
    fontSize: 19,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.3,
  },
  badgeRow: { flexDirection: "row", gap: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  badgeText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
});

// ─── Icon ─────────────────────────────────────────────────────────────────────
const ItemIcon: React.FC<{
  iconName: string;
  lib?: "ionicons" | "material-community";
  bg: string;
}> = ({ iconName, lib = "ionicons", bg }) => (
  <View style={[iStyles.wrap, { backgroundColor: bg }]}>
    {lib === "material-community" ? (
      <MaterialCommunityIcons name={iconName} size={18} color="#fff" />
    ) : (
      <Ionicons name={iconName} size={18} color="#fff" />
    )}
  </View>
);

const iStyles = StyleSheet.create({
  wrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});

// ─── Setting Row (pressable) ──────────────────────────────────────────────────
const SettingItem: React.FC<{
  iconName: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  lib?: "ionicons" | "material-community";
  iconBg?: string;
  danger?: boolean;
  isLast?: boolean;
}> = ({ iconName, label, sublabel, onPress, lib, iconBg, danger, isLast }) => (
  <TouchableOpacity
    style={[rStyles.row, isLast && rStyles.rowLast]}
    onPress={onPress}
    activeOpacity={0.65}
  >
    <ItemIcon
      iconName={iconName}
      lib={lib}
      bg={danger ? C.rose : iconBg ?? C.red}
    />
    <View style={rStyles.textCol}>
      <Text style={[rStyles.label, danger && { color: C.rose }]}>{label}</Text>
      {sublabel ? <Text style={rStyles.sub}>{sublabel}</Text> : null}
    </View>
    <View style={rStyles.chevronWrap}>
      <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
    </View>
  </TouchableOpacity>
);

// ─── Setting Row (switch) ─────────────────────────────────────────────────────
const SettingSwitchItem: React.FC<{
  iconName: string;
  label: string;
  sublabel?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  lib?: "ionicons" | "material-community";
  iconBg?: string;
  isLast?: boolean;
}> = ({
  iconName,
  label,
  sublabel,
  value,
  onValueChange,
  lib,
  iconBg,
  isLast,
}) => (
  <View style={[rStyles.row, isLast && rStyles.rowLast]}>
    <ItemIcon iconName={iconName} lib={lib} bg={iconBg ?? C.red} />
    <View style={rStyles.textCol}>
      <Text style={rStyles.label}>{label}</Text>
      {sublabel ? <Text style={rStyles.sub}>{sublabel}</Text> : null}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: "#DDE1EA", true: C.red }}
      thumbColor="#fff"
      ios_backgroundColor="#DDE1EA"
    />
  </View>
);

const rStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  rowLast: { borderBottomWidth: 0 },
  textCol: { flex: 1 },
  label: {
    fontSize: 14.5,
    fontWeight: "600",
    color: C.text,
    letterSpacing: 0.1,
  },
  sub: { fontSize: 11.5, color: C.textSub, marginTop: 2 },
  chevronWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.border,
    borderRadius: 7,
  },
});

// ─── Section Group ────────────────────────────────────────────────────────────
const SectionGroup: React.FC<{ title?: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View style={sStyles.group}>
    {title ? (
      <View style={sStyles.titleRow}>
        <View style={sStyles.titleLine} />
        <Text style={sStyles.title}>{title}</Text>
        <View style={sStyles.titleLine} />
      </View>
    ) : null}
    <View style={sStyles.card}>{children}</View>
  </View>
);

const sStyles = StyleSheet.create({
  group: { marginHorizontal: 16, marginTop: 22 },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  titleLine: { flex: 1, height: 1, backgroundColor: C.border },
  title: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textSub,
    letterSpacing: 1.2,
    marginHorizontal: 10,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#1A2340",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});

// ─── Password Input ───────────────────────────────────────────────────────────
const PasswordInput: React.FC<{
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
}> = ({ placeholder, value, onChangeText }) => {
  const [show, setShow] = useState(false);
  return (
    <View style={pStyles.wrap}>
      <TextInput
        style={pStyles.input}
        placeholder={placeholder}
        placeholderTextColor="#BCC4CE"
        secureTextEntry={!show}
        value={value}
        onChangeText={onChangeText}
      />
      <TouchableOpacity onPress={() => setShow((s) => !s)} style={pStyles.eye}>
        <Ionicons
          name={show ? "eye-off-outline" : "eye-outline"}
          size={18}
          color="#AAB2BC"
        />
      </TouchableOpacity>
    </View>
  );
};

const pStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#EDF0F5",
    borderRadius: 14,
    marginBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F7F9FC",
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 14, color: C.text },
  eye: { padding: 4 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const SettingScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<UserInfo>();
  const appVersionLabel = `v${DeviceInfo.getVersion()}`;

  const rnBiometrics = useRef(new ReactNativeBiometrics()).current;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(false);

  const navigation = useNavigation<StackNavigation<"Profile">>();
  const { logout, logoutReason } = useAuth();
  const isFocused = useIsFocused();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const userRef = useRef<UserInfo | undefined>(undefined);
  const hasLoadedOnceRef = useRef(false);
  const loadingRef = useRef(false);
  const isLoggingOutRef = useRef(false);
  const isMountedRef = useRef(true);
  const isScreenActiveRef = useRef(false);
  const isFocusedRef = useRef(false);
  const lastErrorAlertAtRef = useRef(0);
  const blockingLoaderActiveRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      isScreenActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    hasLoadedOnceRef.current = hasLoadedOnce;
  }, [hasLoadedOnce]);
  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  const canUpdateScreen = () =>
    isMountedRef.current &&
    isScreenActiveRef.current &&
    isFocusedRef.current &&
    !isLoggingOutRef.current &&
    logoutReason !== "EXPIRED";

  const showAlertIfActive = (title: string, message: string) => {
    if (!canUpdateScreen()) return;
    const now = Date.now();
    if (now - lastErrorAlertAtRef.current < 1500) return;
    lastErrorAlertAtRef.current = now;
    Alert.alert(title, message);
  };

  const isAuthExpiredError = (error: any) =>
    error?.NEED_LOGIN ||
    error?.response?.status === 401 ||
    error?.response?.status === 403;

  const fetchData = React.useCallback(async () => {
    if (loadingRef.current || !canUpdateScreen()) return;
    loadingRef.current = true;
    const shouldShowBlockingLoader =
      !hasLoadedOnceRef.current && !userRef.current;
    blockingLoaderActiveRef.current = shouldShowBlockingLoader;
    if (isMountedRef.current && shouldShowBlockingLoader) setIsLoading(true);
    try {
      const [response, flag] = await Promise.all([
        callApi<{ success: boolean; data: UserInfo }>(
          "POST",
          API_ENDPOINTS.GET_INFO,
          {},
        ),
        AsyncStorage.getItem(FACE_ID_ENABLED_KEY),
      ]);
      if (!canUpdateScreen()) return;
      userRef.current = response.data;
      hasLoadedOnceRef.current = true;
      setUser(response.data);
      setHasLoadedOnce(true);
      setIsFaceIdEnabled(flag === "1");
    } catch (error: any) {
      if (canUpdateScreen()) {
        hasLoadedOnceRef.current = true;
        setHasLoadedOnce(true);
      }
      const isOffline = !error?.response || error?.code === "ECONNABORTED";
      if (
        isOffline ||
        error?.OFFLINE ||
        isAuthExpiredError(error) ||
        !canUpdateScreen()
      )
        return;
      showAlertIfActive("Lỗi", "Không thể tải thông tin người dùng.");
    } finally {
      loadingRef.current = false;
      if (
        blockingLoaderActiveRef.current &&
        isMountedRef.current &&
        isScreenActiveRef.current
      ) {
        setIsLoading(false);
        blockingLoaderActiveRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    if (!isFocused) {
      isScreenActiveRef.current = false;
      return;
    }
    isScreenActiveRef.current = true;
    fetchData();
    return () => {
      isScreenActiveRef.current = false;
    };
  }, [fetchData, isFocused]);

  const handleToggleFaceID = async (value: boolean) => {
    if (!isMountedRef.current) return;
    if (!value) {
      await Keychain.resetGenericPassword({ service: FACE_ID_LOGIN_SERVICE });
      await AsyncStorage.setItem(FACE_ID_ENABLED_KEY, "0");
      if (!isMountedRef.current) return;
      setIsFaceIdEnabled(false);
      Alert.alert("FaceID", "Đã tắt đăng nhập bằng FaceID.");
      return;
    }
    try {
      const saved = await Keychain.getGenericPassword({
        service: AUTH_LOGIN_SERVICE,
      });
      if (!isMountedRef.current) return;
      const { available } = await rnBiometrics.isSensorAvailable();
      if (!isMountedRef.current) return;
      if (!available) {
        Alert.alert("FaceID", "Thiết bị không hỗ trợ FaceID.");
        setIsFaceIdEnabled(false);
        return;
      }
      if (!saved) {
        Alert.alert("Không thể bật", "Bạn cần đăng nhập trước.");
        setIsFaceIdEnabled(false);
        return;
      }
      await Keychain.setGenericPassword(saved.username, saved.password, {
        service: FACE_ID_LOGIN_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      });
      await AsyncStorage.setItem(FACE_ID_ENABLED_KEY, "1");
      if (!isMountedRef.current) return;
      setIsFaceIdEnabled(true);
      Alert.alert("FaceID", "Đã bật đăng nhập bằng FaceID!");
    } catch {
      if (!isMountedRef.current) return;
      Alert.alert("Lỗi", "Không thể bật FaceID.");
      setIsFaceIdEnabled(false);
    }
  };

  const handlePressLogout = async () => {
    if (isLoading) return;
    isLoggingOutRef.current = true;
    if (isMountedRef.current) setIsLoading(true);
    try {
      hardResetApi();
      resetAuthState();
      await clearTokenStorage();
      await logout();
      dispatch(clearPermissions());
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (newPassword.length < 4) {
      Alert.alert("Lỗi", "Mật khẩu mới phải có ít nhất 4 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp.");
      return;
    }
    if (oldPassword === newPassword) {
      Alert.alert("Lỗi", "Mật khẩu mới phải khác mật khẩu cũ.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await changePasswordApi(oldPassword, newPassword);
      if (response?.success) {
        const saved = await Keychain.getGenericPassword({
          service: AUTH_LOGIN_SERVICE,
        });
        if (saved) {
          await Keychain.setGenericPassword(saved.username, newPassword, {
            service: AUTH_LOGIN_SERVICE,
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          });
          if (isFaceIdEnabled) {
            await Keychain.setGenericPassword(saved.username, newPassword, {
              service: FACE_ID_LOGIN_SERVICE,
              accessControl:
                Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
              accessible:
                Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
            });
          }
        }
        Alert.alert("Thành công", "Đổi mật khẩu thành công!");
        closeModal();
      } else {
        Alert.alert("Lỗi", response?.message || "Đổi mật khẩu thất bại!");
      }
    } catch (error: any) {
      if (isAuthExpiredError(error) || logoutReason === "EXPIRED") return;
      Alert.alert(
        "Lỗi",
        error.response?.data?.message ||
          "Không thể đổi mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  if (isLoading || (!user && !hasLoadedOnce)) {
    return <IsLoading size="large" color={C.red} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.red} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Red gradient header zone ── */}
        <LinearGradient
          colors={[C.redLight, C.red, C.redDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.redZone}
        >
          <SettingHeader
            name={user?.moTa}
            avatarUrl={user?.avatarUrl}
            safeTop={insets.top}
          />
          <WaveDivider />
        </LinearGradient>

        {/* ── Grey content zone ── */}
        <View style={styles.greyZone}>
          <SectionGroup title="TÀI KHOẢN">
            <SettingItem
              iconName="person-outline"
              iconBg={C.blue}
              label="Hồ sơ cá nhân"
              sublabel="Xem và chỉnh sửa thông tin"
              onPress={() => navigation.navigate("Profile")}
            />
            <SettingItem
              iconName="lock-closed-outline"
              iconBg={C.amber}
              label="Đổi mật khẩu"
              sublabel="Cập nhật mật khẩu đăng nhập"
              onPress={() => setIsModalVisible(true)}
            />
            {Platform.OS === "ios" && (
              <SettingSwitchItem
                iconName="face-recognition"
                lib="material-community"
                iconBg={C.violet}
                label="Đăng nhập FaceID"
                sublabel="Dùng nhận diện khuôn mặt"
                value={isFaceIdEnabled}
                onValueChange={handleToggleFaceID}
                isLast
              />
            )}
          </SectionGroup>

          <SectionGroup title="KHÁC">
            <SettingItem
              iconName="log-out-outline"
              label="Đăng xuất"
              sublabel="Thoát khỏi tài khoản hiện tại"
              danger
              isLast
              onPress={() =>
                Alert.alert("Xác nhận", "Bạn muốn đăng xuất?", [
                  { text: "Hủy", style: "cancel" },
                  {
                    text: "Đăng xuất",
                    style: "destructive",
                    onPress: handlePressLogout,
                  },
                ])
              }
            />
          </SectionGroup>

          {/* Version tag */}
          <View style={styles.versionWrap}>
            <Text style={styles.versionText}>{appVersionLabel}</Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Change Password Modal ── */}
      <Modal
        transparent
        animationType="slide"
        visible={isModalVisible}
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={closeModal}
      >
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.handle} />

            {/* Icon */}
            <LinearGradient
              colors={[C.red, C.redDeep]}
              style={mStyles.iconGradient}
            >
              <Ionicons name="lock-closed" size={22} color="#fff" />
            </LinearGradient>

            <Text style={mStyles.title}>Đổi mật khẩu</Text>
            <Text style={mStyles.subtitle}>
              Nhập mật khẩu hiện tại và mật khẩu mới
            </Text>

            <PasswordInput
              placeholder="Mật khẩu hiện tại"
              value={oldPassword}
              onChangeText={setOldPassword}
            />
            <PasswordInput
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <PasswordInput
              placeholder="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[C.redLight, C.red]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={mStyles.confirmBtn}
              >
                <Text style={mStyles.confirmText}>Xác nhận đổi mật khẩu</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={mStyles.cancelBtn} onPress={closeModal}>
              <Text style={mStyles.cancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Global Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  redZone: {
    /* gradient applied inline */
  },
  greyZone: { backgroundColor: C.bg, flexGrow: 1, paddingBottom: 48 },
  versionWrap: {
    alignItems: "center",
    marginTop: 32,
  },
  versionText: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: "500",
    letterSpacing: 0.5,
    backgroundColor: C.card,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    overflow: "hidden",
  },
});

const mStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(10,15,30,0.55)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDE1EA",
    alignSelf: "center",
    marginBottom: 24,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
    shadowColor: C.red,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12.5,
    color: C.textSub,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 18,
  },
  confirmBtn: {
    borderRadius: 14,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: C.red,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  confirmText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  cancelBtn: { marginTop: 12, paddingVertical: 12, alignItems: "center" },
  cancelText: { color: C.textSub, fontSize: 14, fontWeight: "600" },
});

export default SettingScreen;
