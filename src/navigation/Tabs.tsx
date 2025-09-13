import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import { View, StyleSheet } from "react-native";
import SettingStack from "./SettingStack";
import HomeStack from "./HomeStack";
import QrScannerScreen from "../screens/QrScanner/QrScannerScreen";

const Tab = createBottomTabNavigator();

export default function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#fff",
        tabBarStyle: {
          position: "absolute",
          height: 70,
          backgroundColor: "#FF3333",
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "bold" },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: "Trang chủ",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="ScanTab"
        component={QrScannerScreen}
        options={{
          title: "",
          headerShown: false,
          tabBarIcon: () => (
            <View style={styles.scanButton}>
              <Ionicons name="qr-code-outline" size={32} color="#fff" />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="SettingTab"
        component={SettingStack}
        options={{
          title: "Cài đặt",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FF3333",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
});
