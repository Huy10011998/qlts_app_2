import React, { useEffect, useMemo, useState, useRef } from "react";
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
import { QrDetailsProps } from "../../types/Index";
import { useParams } from "../../hooks/useParams";
import { getDetails } from "../../services/Index";
import IsLoading from "../ui/IconLoading";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/Index";
import Ionicons from "react-native-vector-icons/Ionicons";
import { parseFieldActive } from "../../utils/parser/parseFieldActive";
import { groupFields } from "../../utils/parser/groupFields";
import { getFieldValue } from "../../utils/Helper";
import { log } from "../../utils/Logger";

const { width } = Dimensions.get("window");
const MENU_WIDTH = width * 0.6;

export default function QrDetails({ children }: QrDetailsProps) {
  const { id, nameClass, field } = useParams();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [activeTab, setActiveTab] = useState("list");
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<any>(null);

  // Drawer state
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(MENU_WIDTH)).current;

  // parse fields safely
  const fieldActive = useMemo(() => parseFieldActive(field), [field]);

  // grouped by groupLayout (kept as-is style D)
  const groupedFields = useMemo(() => groupFields(fieldActive), [fieldActive]);

  const handleChangeTab = (tabKey: string) => {
    setActiveTab(tabKey);
  };

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // Drawer functions
  const openMenu = async () => {
    setMenuVisible(true);

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: MENU_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

  const toggleMenu = () => {
    if (menuVisible) closeMenu();
    else openMenu();
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={toggleMenu} style={{ paddingHorizontal: 5 }}>
          <Ionicons name="menu" size={26} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, toggleMenu]);

  // Fetch chi tiết asset
  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        if (!id || !nameClass) throw new Error("Thiếu ID hoặc nameClass");
        const response = await getDetails(nameClass, id);
        setItem(response.data);
      } catch (error) {
        console.error(error);
        Alert.alert("Lỗi", `Không thể tải chi tiết ${nameClass}`);
      } finally {
        setIsLoading(false);
      }
    };
    setActiveTab("list");
    fetchDetails();
  }, [id, nameClass]);

  if (isLoading) {
    return <IsLoading size="large" color="#FF3333" />;
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

      {/* Drawer */}
      <Animated.View
        pointerEvents={menuVisible ? "auto" : "none"}
        style={[
          styles.menuContainer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        >
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
            Menu
          </Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => log("Báo hỏng")}
          >
            <Text style={styles.menuItemText}>Báo hỏng / Yêu cầu sửa chữa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => log("Thang lý")}
          >
            <Text style={styles.menuItemText}>Thanh lý</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => log("Trung chuyển")}
          >
            <Text style={styles.menuItemText}>Trung chuyển</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* Overlay */}
      {menuVisible && <Pressable style={styles.overlay} onPress={closeMenu} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9", paddingBottom: 20 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 998,
  },

  menuContainer: {
    position: "absolute",
    right: 0,
    width: MENU_WIDTH,
    height: "100%",
    backgroundColor: "#fff",
    zIndex: 999,
  },

  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  menuItemText: {
    fontSize: 15,
    color: "#333",
  },
});
