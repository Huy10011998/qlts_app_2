import React, {
  useEffect,
  useState,
  useCallback,
} from "react";
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

import { QrDetailsProps, RootStackParamList } from "../../types/Index";
import { useParams } from "../../hooks/useParams";
import { getClassReference, getDetails } from "../../services/Index";
import IsLoading from "../ui/IconLoading";
import { error, log } from "../../utils/Logger";
import { getFieldValue } from "../../utils/fields/GetFieldValue";
import { useAppDispatch } from "../../store/Hooks";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { resetShouldRefreshDetails } from "../../store/AssetSlice";
import { useAutoReload } from "../../hooks/useAutoReload";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useDetailViewState } from "../../hooks/useDetailViewState";
import { useSlideInPanel } from "../../hooks/useSlideInPanel";
import SlideInSidePanel from "../shared/SlideInSidePanel";

const { width } = Dimensions.get("window");
const MENU_WIDTH = width * 0.6;

export default function QrDetails({ children }: QrDetailsProps) {
  const { id, nameClass, field, itemData } = useParams();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  //  STATE
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<any>(null);

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

  // Redux
  const dispatch = useAppDispatch();
  const shouldRefreshDetails = useSelector(
    (state: RootState) => state.asset.shouldRefreshDetails,
  );
  const { isMounted, showAlertIfActive } = useSafeAlert();

  //  HEADER
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={toggleMenu} style={{ paddingHorizontal: 8 }}>
          <Ionicons name="menu" size={26} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, toggleMenu]);

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
    // Guard đầu — sau dòng này TypeScript biết id và nameClass là string
    if (!id || !nameClass) {
      setIsLoading(false);
      return;
    }

    if (itemData) {
      setItem(itemData);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await getDetails(nameClass, id); // ✅ không lỗi
      setItem(response.data);
    } catch (e) {
      error(e);
      showAlertIfActive("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    } finally {
      if (isMounted()) setIsLoading(false);
    }
  }, [id, nameClass, itemData]);

  useFocusEffect(
    useCallback(() => {
      if (shouldRefreshDetails) {
        fetchDetails();
        dispatch(resetShouldRefreshDetails());
      }
    }, [shouldRefreshDetails, fetchDetails]),
  );

  useAutoReload(fetchDetails);

  // fetch lần đầu khi mount
  useEffect(() => {
    if (id && nameClass) fetchDetails();
    else setIsLoading(false);
  }, [id, nameClass, fetchDetails]);

  if (isLoading) return <IsLoading size="large" color="#E31E24" />;

  //  RENDER
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

      <SlideInSidePanel
        bodyStyle={styles.menuContent}
        onClose={closeMenu}
        showCloseButton={false}
        title="Menu"
        translateX={slideAnim}
        visible={menuVisible}
        width={MENU_WIDTH}
      >
        {nameClass !== "BinhChuaChay" &&
          nameClass !== "HongChuaChay" &&
          nameClass !== "TuChuaChay" && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => log("Báo hỏng")}
              >
                <Text style={styles.menuItemText}>
                  Báo hỏng / Yêu cầu sửa chữa
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => log("Thanh lý")}
              >
                <Text style={styles.menuItemText}>Thanh lý</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => log("Trung chuyển")}
              >
                <Text style={styles.menuItemText}>Trung chuyển</Text>
              </TouchableOpacity>
            </>
          )}

        <TouchableOpacity style={styles.menuItem} onPress={() => handlePress()}>
          <Text style={styles.menuItemText}>Đánh giá</Text>
        </TouchableOpacity>
      </SlideInSidePanel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },

  menuContent: {
    padding: 16,
    paddingBottom: 24,
  },

  menuTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },

  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  menuItemText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
});
