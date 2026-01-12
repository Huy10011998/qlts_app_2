import React from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  MenuItemCardProps,
  MenuItemComponent,
  StackNavigation,
} from "../../types";

const { width: screenWidth } = Dimensions.get("window");
const itemWidth = screenWidth / 3;
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  iconName,
  label,
  notificationCount,
  index,
  onPress,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      delay: index * 100,
    }).start();
  }, [index, scaleAnim]);

  return (
    <AnimatedTouchable
      style={[styles.menuItemContainer, { transform: [{ scale: scaleAnim }] }]}
      onPress={onPress}
    >
      <View style={styles.menuItemBox}>
        <View style={styles.iconWrapper}>
          <View style={styles.iconCircle}>
            <Ionicons name={iconName} color="white" size={24} />
          </View>
          {notificationCount ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>{notificationCount}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.menuItemLabel}>{label}</Text>
      </View>
    </AnimatedTouchable>
  );
};

// ===== HOME SCREEN =====
const HomeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation<"Tabs">>();

  const menuItems: MenuItemComponent[] = [
    {
      id: "1",
      label: "Tài sản",
      iconName: "cube-outline",
      onPress: () => {
        navigation.navigate("Asset");
      },
    },
    {
      id: "2",
      label: "Công việc",
      iconName: "briefcase-outline",
    },
    {
      id: "3",
      label: "Ticket",
      iconName: "pricetag-outline",
    },
  ];

  return (
    <ScrollView contentContainerStyle={[styles.container]}>
      <View style={styles.gridWrapper}>
        {menuItems.map((item, index) => (
          <MenuItemCard key={item.id} {...item} index={index} />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 0, backgroundColor: "white", flexGrow: 1 },

  gridWrapper: { flexDirection: "row", flexWrap: "wrap", paddingTop: 16 },

  menuItemContainer: {
    width: itemWidth,
    alignItems: "center",
    marginBottom: 16,
  },

  menuItemBox: {
    width: itemWidth - 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  iconWrapper: { position: "relative" },

  iconCircle: {
    backgroundColor: "#FF3333",
    padding: 16,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "red",
    borderRadius: 10,
    paddingHorizontal: 4,
    minWidth: 18,
    alignItems: "center",
  },

  notificationText: { color: "white", fontSize: 10, fontWeight: "bold" },

  menuItemLabel: {
    marginTop: 8,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "500",
    color: "#333",
  },
});

export default HomeScreen;
