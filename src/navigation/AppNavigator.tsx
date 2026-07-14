import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/index";
import Tabs from "./Tabs";
import VehicleJourneyMapScreen from "../screens/Home/VehicleJourneyMapScreen";
import VehicleTrackingMapScreen from "../screens/Home/VehicleTrackingMapScreen";
import VehicleCurrentLocationScreen from "../screens/Home/VehicleCurrentLocationScreen";
import { getScreenTitle, headerWithBack } from "./shared/navigationOptions";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen
        name="VehicleJourneyMap"
        component={VehicleJourneyMapScreen}
        options={({ route }) => ({
          headerShown: true,
          title: getScreenTitle(route.params?.titleHeader, "Bản đồ hành trình"),
          ...headerWithBack,
        })}
      />
      <Stack.Screen
        name="VehicleTrackingMap"
        component={VehicleTrackingMapScreen}
        options={({ route }) => ({
          headerShown: true,
          title: getScreenTitle(route.params?.titleHeader, "Bản đồ dừng đỗ"),
          ...headerWithBack,
        })}
      />
      <Stack.Screen
        name="VehicleCurrentLocation"
        component={VehicleCurrentLocationScreen}
        options={{
          headerShown: true,
          title: "Vị trí hiện tại phương tiện",
          ...headerWithBack,
        }}
      />
    </Stack.Navigator>
  );
}
