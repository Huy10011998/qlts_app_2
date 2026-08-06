import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../types/index";
import HeaderHome from "../components/header/HeaderHome";
import HomeScreen from "../screens/Home/HomeScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

function renderHomeHeader() {
  return <HeaderHome />;
}

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ header: renderHomeHeader }}
      />
    </Stack.Navigator>
  );
}
