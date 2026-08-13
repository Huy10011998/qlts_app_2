import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import {
  Camera,
  Code,
  CodeScanner,
  useCodeScanner,
} from "react-native-vision-camera";

import QrScannerGateView from "../../../components/qrcode/shared/QrScannerGateView";
import QrScannerViewportOverlay from "../../../components/qrcode/shared/QrScannerViewportOverlay";
import useQrScannerController from "../../../components/qrcode/shared/useQrScannerController";
import SearchBar from "../../../components/ui/SearchBar";
import { useSafeAlert } from "../../../hooks/useSafeAlert";
import { isNetworkRequestError } from "../../../utils/helpers/api";
import { error } from "../../../utils/Logger";
import {
  AppColors,
  C,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import { getFridgeFromQr, searchFridges, type FridgeSummary } from "./fridgeLookup";

const SEARCH_DEBOUNCE_MS = 400;

type FridgeScannerViewProps = {
  title: string;
  /** Cho chọn nhiều tủ (luồng trung chuyển) thay vì đi tiếp ngay khi quét được. */
  multiple?: boolean;
  /** Tủ đã có sẵn khi vào màn — luồng trung chuyển vào từ chi tiết một tủ. */
  initialSelected?: FridgeSummary[];
  submitLabel?: string;
  onSubmit: (fridges: FridgeSummary[]) => void;
};

/**
 * Màn quét QR chọn tủ lạnh, dùng chung cho bước [1] của cả hai luồng nội địa.
 *
 * Ngoài camera còn có ô nhập seri thủ công: tem QR ngoài hiện trường hay mờ /
 * bong, nhân viên phải gõ được số seri in trên máy.
 */
export default function FridgeScannerView({
  title,
  multiple = false,
  initialSelected,
  submitLabel = "Tiếp tục",
  onSubmit,
}: FridgeScannerViewProps) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const sheetStyles = useStyles(makeSheetStyles);
  const c = useAppColors();
  const { showAlertIfActive } = useSafeAlert();

  const [selected, setSelected] = useState<FridgeSummary[]>(
    initialSelected ?? [],
  );
  const [isResolving, setIsResolving] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<FridgeSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const {
    activateScanner,
    cameraActive,
    clearInitTimeoutTimer,
    deactivateScanner,
    device,
    format,
    hasPermission,
    initTimeout,
    isTorchOn,
    resetScannerSession,
    resumeScanner,
    scanLineAnim,
    scannedRef,
    setIsTorchOn,
    startInitTimeoutTimer,
  } = useQrScannerController({ enabled: true });

  useFocusEffect(
    useCallback(() => {
      resetScannerSession();

      const timeout = setTimeout(activateScanner, 100);
      startInitTimeoutTimer();

      return () => {
        clearTimeout(timeout);
        clearInitTimeoutTimer();
        deactivateScanner();
      };
    }, [
      activateScanner,
      clearInitTimeoutTimer,
      deactivateScanner,
      resetScannerSession,
      startInitTimeoutTimer,
    ]),
  );

  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  /**
   * Nhận một tủ vừa quét/chọn. Ở chế độ nhiều tủ, quét trùng seri thì bỏ qua
   * chứ không thêm hai lần vào danh sách.
   */
  const acceptFridge = useCallback(
    (fridge: FridgeSummary) => {
      if (!multiple) {
        onSubmit([fridge]);
        return;
      }

      const isDuplicate = selectedRef.current.some(
        (item) => item.id === fridge.id,
      );

      if (isDuplicate) {
        showAlertIfActive(
          "Đã có trong danh sách",
          `Tủ ${fridge.serialNumber || fridge.label} đã được chọn.`,
          [{ text: "OK", onPress: resumeScanner }],
        );
        return;
      }

      setSelected((prev) => [...prev, fridge]);
      ReactNativeHapticFeedback.trigger("notificationSuccess");
      resumeScanner();
    },
    [multiple, onSubmit, resumeScanner, showAlertIfActive],
  );

  const codeScanner: CodeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: async (codes: Code[]) => {
      if (!codes.length || scannedRef.current) return;

      scannedRef.current = true;
      deactivateScanner();
      ReactNativeHapticFeedback.trigger("impactLight");

      const raw = codes[0]?.value ?? "";

      setIsResolving(true);
      try {
        const fridge = await getFridgeFromQr(raw);

        if (!fridge) {
          showAlertIfActive(
            "Mã QR không hợp lệ",
            "Mã này không phải mã tủ lạnh nội địa.",
            [{ text: "OK", onPress: resumeScanner }],
          );
          return;
        }

        acceptFridge(fridge);
      } catch (e) {
        const isNetworkError = isNetworkRequestError(e);
        if (!isNetworkError) error(e);

        showAlertIfActive(
          isNetworkError ? "Lỗi kết nối" : "Không đọc được mã QR",
          isNetworkError
            ? "Không thể tải thông tin tủ lạnh. Vui lòng kiểm tra kết nối mạng rồi thử lại."
            : "Không tìm thấy tủ lạnh tương ứng với mã này.",
          [{ text: "OK", onPress: resumeScanner }],
        );
      } finally {
        setIsResolving(false);
      }
    },
  });

  // Tìm theo seri: debounce để mỗi ký tự gõ thêm không thành một lượt gọi API.
  useEffect(() => {
    if (!isManualOpen) return;

    const keyword = searchText.trim();

    if (keyword.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    let isActive = true;
    setIsSearching(true);

    const timeout = setTimeout(async () => {
      try {
        const fridges = await searchFridges(keyword);
        if (!isActive) return;

        setSearchResults(fridges);
      } catch (e) {
        if (!isActive) return;
        if (!isNetworkRequestError(e)) error(e);
        setSearchResults([]);
      } finally {
        if (isActive) {
          setIsSearching(false);
          setHasSearched(true);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [isManualOpen, searchText]);

  const closeManualSearch = useCallback(() => {
    setIsManualOpen(false);
    setSearchText("");
    setSearchResults([]);
    setHasSearched(false);
  }, []);

  const handlePickFromSearch = useCallback(
    (fridge: FridgeSummary) => {
      closeManualSearch();
      acceptFridge(fridge);
    },
    [acceptFridge, closeManualSearch],
  );

  const handleRemove = useCallback((id: number) => {
    setSelected((prev) => prev.filter((item) => item.id !== id));
  }, []);

  if (hasPermission === null) return null;

  if (!hasPermission) {
    return (
      <QrScannerGateView
        iconName="camera-off-outline"
        title="Không có quyền camera"
        description={`Ứng dụng cần quyền truy cập camera để quét mã QR.\nVui lòng cấp quyền trong phần Cài đặt.`}
        actionLabel="Mở Cài đặt"
        onAction={Linking.openSettings}
        onBack={() => navigation.goBack()}
        contentOffsetY={-60}
      />
    );
  }

  if (!device || !format) {
    return (
      <QrScannerGateView
        iconName={initTimeout ? "alert-circle-outline" : "camera-outline"}
        iconColor={initTimeout ? "#FF3B30" : "#999"}
        title={initTimeout ? "Không thể mở camera" : "Đang khởi tạo camera..."}
        description={
          initTimeout ? "Camera không phản hồi. Vui lòng thử lại." : undefined
        }
        actionLabel={initTimeout ? "Quay lại" : undefined}
        onAction={initTimeout ? () => navigation.goBack() : undefined}
        onBack={() => navigation.goBack()}
        contentOffsetY={-60}
      />
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        isActive={cameraActive}
        torch={isTorchOn ? "on" : "off"}
        codeScanner={codeScanner}
        resizeMode="cover"
        enableZoomGesture
      />

      <View
        pointerEvents="box-none"
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity
          style={styles.headerIconButton}
          hitSlop={10}
          onPress={() => {
            deactivateScanner();
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            {title}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconButton}
          hitSlop={10}
          onPress={() => setIsTorchOn((prev) => !prev)}
        >
          <Ionicons
            name={isTorchOn ? "flash" : "flash-off"}
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <QrScannerViewportOverlay scanLineAnim={scanLineAnim} />

      {isResolving ? (
        <View style={styles.resolvingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.resolvingText}>Đang đọc thông tin tủ...</Text>
        </View>
      ) : null}

      <View
        style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16 }]}
        pointerEvents="box-none"
      >
        {multiple ? (
          <View style={styles.selectedCard}>
            <Text style={styles.selectedTitle} allowFontScaling={false}>
              Đã chọn ({selected.length})
            </Text>

            {selected.length ? (
              <ScrollView style={styles.selectedList} nestedScrollEnabled>
                {selected.map((fridge) => (
                  <View key={fridge.id} style={styles.selectedRow}>
                    <Ionicons
                      name="cube-outline"
                      size={16}
                      color="rgba(255,255,255,0.75)"
                    />
                    <Text
                      style={styles.selectedRowText}
                      numberOfLines={1}
                      allowFontScaling={false}
                    >
                      {fridge.serialNumber || fridge.label}
                    </Text>
                    <TouchableOpacity
                      hitSlop={8}
                      onPress={() => handleRemove(fridge.id)}
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color="rgba(255,255,255,0.6)"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.selectedEmpty}>
                Quét mã QR hoặc nhập seri để thêm tủ.
              </Text>
            )}
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => {
            deactivateScanner();
            setIsManualOpen(true);
          }}
        >
          <Ionicons name="keypad-outline" size={18} color="#fff" />
          <Text style={styles.manualButtonText} allowFontScaling={false}>
            Nhập seri thủ công
          </Text>
        </TouchableOpacity>

        {multiple ? (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              !selected.length && styles.primaryButtonDisabled,
            ]}
            disabled={!selected.length}
            onPress={() => onSubmit(selected)}
          >
            <Text style={styles.primaryButtonText} allowFontScaling={false}>
              {submitLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal
        visible={isManualOpen}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => {
          closeManualSearch();
          resumeScanner();
        }}
      >
        <Pressable
          style={sheetStyles.modalBackdrop}
          onPress={() => {
            closeManualSearch();
            resumeScanner();
          }}
        />
        <View style={[sheetStyles.modalSheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={sheetStyles.modalHandle} />
          <Text style={sheetStyles.modalTitle}>Tìm tủ lạnh theo seri</Text>

          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Nhập số seri, mã hoặc tên tủ"
            isSearching={isSearching}
            variant="plain"
            style={sheetStyles.modalSearchBar}
          />

          <FlatList
            data={searchResults}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            style={sheetStyles.modalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={sheetStyles.resultRow}
                onPress={() => handlePickFromSearch(item)}
              >
                <View style={sheetStyles.resultTextWrap}>
                  <Text style={sheetStyles.resultTitle} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={sheetStyles.resultSubtitle} numberOfLines={1}>
                    Seri: {item.serialNumber || "—"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={sheetStyles.modalEmpty}>
                {searchText.trim().length < 2
                  ? "Nhập ít nhất 2 ký tự để tìm."
                  : isSearching
                    ? "Đang tìm..."
                    : hasSearched
                      ? "Không tìm thấy tủ lạnh phù hợp."
                      : ""}
              </Text>
            }
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
  resolvingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  resolvingText: {
    marginTop: 12,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    gap: 10,
  },
  selectedCard: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 14,
    padding: 12,
  },
  selectedTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  selectedList: {
    maxHeight: 132,
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
  },
  selectedRowText: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
  },
  selectedEmpty: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12.5,
  },
  manualButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  manualButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.red,
  },
  primaryButtonDisabled: {
    backgroundColor: "rgba(227,30,36,0.45)",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});

/**
 * Bảng nhập seri là mặt phẳng giao diện thường của app (không nằm đè lên khung
 * camera tối), nên phải theo theme sáng/tối như mọi bottom sheet khác.
 */
const makeSheetStyles = (c: AppColors) =>
  StyleSheet.create({
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    modalSheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: "78%",
      backgroundColor: c.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    modalHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.borderStrong,
      marginBottom: 10,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
      marginBottom: 10,
    },
    modalSearchBar: {
      marginBottom: 8,
    },
    modalList: {
      flexGrow: 0,
    },
    resultRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    resultTextWrap: {
      flex: 1,
    },
    resultTitle: {
      fontSize: 14.5,
      fontWeight: "600",
      color: c.text,
    },
    resultSubtitle: {
      marginTop: 2,
      fontSize: 12.5,
      color: c.textSecondary,
    },
    modalEmpty: {
      paddingVertical: 18,
      textAlign: "center",
      fontSize: 13,
      color: c.textSub,
    },
  });
