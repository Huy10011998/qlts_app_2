import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { QrDetailsProps, RootStackParamList } from "../../types/index";
import { useParams } from "../../hooks/useParams";
import { getClassReference, getDetails } from "../../services";
import IsLoading from "../ui/IconLoading";
import EmptyState from "../ui/EmptyState";
import { error, log } from "../../utils/Logger";
import { getFieldValue } from "../../utils/fields/GetFieldValue";
import { useAppDispatch } from "../../store/hooks";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { resetShouldRefreshDetails } from "../../store/AssetSlice";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useDetailViewState } from "../../hooks/useDetailViewState";
import { useSlideInPanel } from "../../hooks/useSlideInPanel";
import SlideInSidePanel from "../shared/SlideInSidePanel";
import { C, useSeparatorColor } from "../../utils/helpers/colors";
import AssetListEmptyState from "../assets/shared/AssetListEmptyState";
import { REVIEW_NAME_CLASSES } from "../../constants/reviewNameClasses";

const { width } = Dimensions.get("window");
const MENU_WIDTH = width * 0.6;

function QrDetailsMenuButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.headerButton}>
      <Ionicons name="menu" size={26} color="#fff" />
    </TouchableOpacity>
  );
}

export default function QrDetails({ children }: QrDetailsProps) {
  const separatorColor = useSeparatorColor();
  const { id, nameClass, field, itemData } = useParams();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<any>(null);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const {
    activeTab,
    collapsedGroups,
    fieldActive,
    groupedFields,
    handleChangeTab,
    toggleGroup,
  } = useDetailViewState(field);

  const {
    closePanel: closeMenu,
    togglePanel: toggleMenu,
    translateAnim: slideAnim,
    visible: menuVisible,
  } = useSlideInPanel({
    initialOffset: MENU_WIDTH,
  });

  const dispatch = useAppDispatch();
  const shouldRefreshDetails = useSelector(
    (state: RootState) => state.asset.shouldRefreshDetails,
  );
  const { isMounted, showAlertIfActive } = useSafeAlert();

  const renderHeaderRight = useCallback(
    () => <QrDetailsMenuButton onPress={toggleMenu} />,
    [toggleMenu],
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderRight]);

  const handlePress = async () => {
    if (!nameClass || !id) {
      Alert.alert("Lỗi", "Thiếu thông tin nameClass hoặc id");
      return;
    }

    try {
      const response = await getClassReference(nameClass);
      const propertyData = response?.data?.[0]?.propertyReference;
      const titleHeader = response?.data?.[0]?.moTa;
      const propertyReference = response?.data?.[0]?.name;

      navigation.navigate("QrReview", {
        idRoot: id,
        nameClassRoot: nameClass,
        nameClass: propertyReference,
        propertyReference: propertyData,
        titleHeader,
      });
    } catch (e) {
      error(e);
      showAlertIfActive("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    }
  };

  const fetchDetails = useCallback(async () => {
    if (!id || !nameClass) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await getDetails(nameClass, id);
      setItem(response.data);
      setLoadErrorMessage(null);
    } catch (e) {
      error(e);
      setItem(null);
      setLoadErrorMessage(
        "Vui lòng kiểm tra kết nối mạng hoặc quay lại để thử lại.",
      );
    } finally {
      if (isMounted()) setIsLoading(false);
    }
  }, [id, isMounted, nameClass]);

  useEffect(() => {
    if (!itemData) return;

    setItem(itemData);
    setLoadErrorMessage(null);
    setIsLoading(false);
  }, [itemData]);

  useFocusEffect(
    useCallback(() => {
      if (shouldRefreshDetails) {
        fetchDetails();
        dispatch(resetShouldRefreshDetails());
      }
    }, [dispatch, fetchDetails, shouldRefreshDetails]),
  );

  useNetworkAwareReload(fetchDetails, {
    hasError: Boolean(loadErrorMessage),
    onOffline: () => {
      setItem(null);
      setLoadErrorMessage(
        "Vui lòng kiểm tra kết nối mạng hoặc quay lại để thử lại.",
      );
    },
  });

  useEffect(() => {
    if (itemData) return;
    if (id && nameClass) fetchDetails();
    else setIsLoading(false);
  }, [fetchDetails, id, itemData, nameClass]);

  const renderMenuPanel = () => (
    <SlideInSidePanel
      bodyStyle={styles.menuContent}
      onClose={closeMenu}
      showCloseButton={false}
      title="Menu"
      translateX={slideAnim}
      visible={menuVisible}
      width={MENU_WIDTH}
    >
      {loadErrorMessage ? (
        <AssetListEmptyState
          iconName="cloud-offline-outline"
          title="Không thể tải menu"
          subtitle="Vui lòng kiểm tra kết nối mạng rồi thử mở lại menu."
        />
      ) : (
        <>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: separatorColor }]}
            onPress={() => log("Báo hỏng")}
          >
            <Text style={styles.menuItemText}>Báo hỏng / Yêu cầu sửa chữa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: separatorColor }]}
            onPress={() => log("Thanh lý")}
          >
            <Text style={styles.menuItemText}>Thanh lý</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: separatorColor }]}
            onPress={() => log("Trung chuyển")}
          >
            <Text style={styles.menuItemText}>Trung chuyển</Text>
          </TouchableOpacity>

          {REVIEW_NAME_CLASSES.includes(nameClass || "") ? (
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: separatorColor }]}
              onPress={() => handlePress()}
            >
              <Text style={styles.menuItemText}>Đánh giá</Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </SlideInSidePanel>
  );

  if (isLoading) return <IsLoading size="large" color={C.red} />;

  if (loadErrorMessage) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyStateRoot}>
          <EmptyState
            iconName="cloud-offline-outline"
            title="Không thể tải chi tiết QR"
            subtitle={loadErrorMessage}
          />
        </View>
        {renderMenuPanel()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {children({
        activeTab,
        setActiveTab: handleChangeTab,
        groupedFields,
        collapsedGroups,
        toggleGroup,
        item,
        getFieldValue,
        nameClass: nameClass || "",
        fieldActive: fieldActive || [],
      })}
      {renderMenuPanel()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.surfaceAlt,
  },
  emptyStateRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  menuContent: {
    padding: 16,
    paddingBottom: 24,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  menuItemText: {
    fontSize: 15,
    color: C.text,
    fontWeight: "500",
  },
  headerButton: {
    paddingHorizontal: 8,
  },
});
