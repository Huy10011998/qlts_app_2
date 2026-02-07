import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  View,
  StyleSheet,
  Alert,
  Animated,
  Pressable,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "react-native-vector-icons/Ionicons";

import { QrDetailsProps, RootStackParamList } from "../../types/Index";
import { useParams } from "../../hooks/useParams";
import { getClassReference, getDetails } from "../../services/Index";
import IsLoading from "../ui/IconLoading";
import { error, log } from "../../utils/Logger";
import { ParseFieldActive } from "../../utils/parser/ParseFieldActive";
import { GroupFields } from "../../utils/parser/GroupFields";
import { ToggleGroupUtil } from "../../utils/parser/ToggleGroup";
import { getFieldValue } from "../../utils/fields/GetFieldValue";
import { useAppDispatch } from "../../store/Hooks";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { resetShouldRefreshDetails } from "../../store/AssetSlice";
import { useAutoReload } from "../../hooks/useAutoReload";

const { width } = Dimensions.get("window");
const MENU_WIDTH = width * 0.6;

export default function QrDetails({ children }: QrDetailsProps) {
  const { id, nameClass, field } = useParams();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  //  STATE
  const [activeTab, setActiveTab] = useState("list");
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<any>(null);

  // Drawer
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(MENU_WIDTH)).current;
  const isAnimating = useRef(false);

  //  PARSER
  const fieldActive = useMemo(() => ParseFieldActive(field), [field]);
  const groupedFields = useMemo(() => GroupFields(fieldActive), [fieldActive]);

  // HANDLERS
  const handleChangeTab = (tabKey: string) => {
    setActiveTab(tabKey);
  };

  // Redux
  const dispatch = useAppDispatch();
  const shouldRefreshDetails = useSelector(
    (state: RootState) => state.asset.shouldRefreshDetails,
  );

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ToggleGroupUtil(prev, groupName));
  };

  // DRAWER
  const openMenu = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
    });
  }, [slideAnim]);

  const closeMenu = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    Animated.timing(slideAnim, {
      toValue: MENU_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
      setMenuVisible(false);
    });
  }, [slideAnim]);

  const toggleMenu = useCallback(() => {
    if (menuVisible) closeMenu();
    else openMenu();
  }, [menuVisible, openMenu, closeMenu]);

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
      Alert.alert("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    }
  };

  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!id || !nameClass) throw new Error("Thiếu ID hoặc nameClass");
      const response = await getDetails(nameClass, id);
      setItem(response.data);
    } catch (e) {
      error(e);
      Alert.alert("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    } finally {
      setIsLoading(false);
    }
  }, [id, nameClass]);

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

  if (isLoading) return <IsLoading size="large" color="#FF3333" />;

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

      {menuVisible && (
        <>
          <Pressable style={styles.overlay} onPress={closeMenu} />

          <Animated.View
            style={[
              styles.menuContainer,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            <ScrollView contentContainerStyle={styles.menuContent}>
              <Text style={styles.menuTitle}>Menu</Text>
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

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handlePress()}
              >
                <Text style={styles.menuItemText}>Đánh giá</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 998,
  },

  menuContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: MENU_WIDTH,
    backgroundColor: "#fff",
    zIndex: 999,
    elevation: 10, // Android
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
