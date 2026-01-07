import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Platform } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeStack from "./HomeStack";
import SettingStack from "./SettingStack";
import ScanStack from "./ScanStack";

const Tab = createBottomTabNavigator();
const TAB_HEIGHT = 56;
const FAB_SIZE = 64;

export default function Tabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,

        tabBarStyle: [
          styles.tabBar,
          {
            height: TAB_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ],

        tabBarLabelStyle: styles.label,
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#ffd6d6",
      }}
    >
      {/* HOME */}
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />

      {/* SCAN – FAB */}
      <Tab.Screen
        name="ScanTab"
        component={ScanStack}
        options={{
          title: "Quét QR",
          tabBarIcon: ({ color }) => (
            <Ionicons name="qr-code-outline" size={30} color={color} />
          ),
        }}
      />

      {/* SETTING */}
      <Tab.Screen
        name="SettingTab"
        component={SettingStack}
        options={{
          title: "Cài đặt",
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// function FabButton({ onPress }: any) {
//   return (
//     <TouchableOpacity
//       activeOpacity={0.85}
//       onPress={onPress}
//       style={styles.fabWrapper}
//     >
//       <View style={styles.fab}>
//         <Ionicons name="qr-code-outline" size={30} color="#fff" />
//       </View>
//     </TouchableOpacity>
//   );
// }

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FF3333",
    borderTopWidth: 0,

    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
        }
      : {
          elevation: 20,
        }),
  },

  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },

  fabWrapper: {
    position: "absolute",
    top: -28,
    alignSelf: "center",
  },

  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: "#FF3333",
    justifyContent: "center",
    alignItems: "center",

    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
        }
      : {
          elevation: 12,
        }),
  },
});
