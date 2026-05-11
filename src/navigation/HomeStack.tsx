import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { RootStackParamList } from "../types/Index";
import HeaderHome from "../components/header/HeaderHome";
import {
  getScreenTitle,
  headerWithBack,
} from "./shared/navigationOptions";
import {
  HOME_SCREEN_COMPONENT,
  HOME_STACK_ROUTE_TITLE_SCREENS,
  HOME_STACK_STATIC_SCREENS,
} from "./shared/homeStackConfig";
import ShareholdersMeetingScannerScreen from "../screens/ShareholdersMeeting/ShareholdersMeetingScannerScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HOME_SCREEN_COMPONENT}
        options={{ header: () => <HeaderHome /> }}
      />

      {HOME_STACK_STATIC_SCREENS.map((screen) => (
        <Stack.Screen
          key={screen.name}
          name={screen.name}
          component={screen.component}
          options={{
            title: screen.title,
            ...headerWithBack,
          }}
        />
      ))}

      <Stack.Screen
        name="ShareholdersMeetingScanner"
        component={ShareholdersMeetingScannerScreen}
        options={{ headerShown: false }}
      />

      {HOME_STACK_ROUTE_TITLE_SCREENS.map((screen) => (
        <Stack.Screen
          key={screen.name}
          name={screen.name}
          component={screen.component}
          options={({ route }) => ({
            title: getScreenTitle(route.params?.titleHeader, screen.fallbackTitle),
            ...headerWithBack,
          })}
        />
      ))}
    </Stack.Navigator>
  );
}
