import React from "react";
import { Platform, View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { HapticTab } from "@/components/HapticTab";
import { TabCustomProps } from "@/types";
import HeaderHome from "../header/HeaderHome";

export default function TabHome({
  screens = [],
  showHeader = true,
  backgroundColor = "#FF3333",
  customHeader: HeaderComponent = HeaderHome,
}: TabCustomProps) {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#fff",
        tabBarButton: HapticTab,
        tabBarBackground: () => (
          <View
            style={[
              styles.tabBarBackground,
              { backgroundColor: backgroundColor },
            ]}
          />
        ),
        tabBarStyle: Platform.select({
          ios: {
            position: "absolute",
            height: 70,
            backgroundColor: backgroundColor,
          },
          android: {
            position: "absolute",
            height: 70,
            backgroundColor: backgroundColor,
          },
        }),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "bold",
        },
      }}
    >
      {screens.map((screen, index) => {
        return (
          <Tabs.Screen
            key={index}
            name={screen.name}
            options={{
              title: screen.title || "",
              headerShown:
                screen.showHeader !== undefined
                  ? screen.showHeader
                  : showHeader,
              header: () => <HeaderComponent />,
              tabBarIcon: ({ color }) => (
                <Ionicons name={screen.icon} size={24} color={color} />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
});
