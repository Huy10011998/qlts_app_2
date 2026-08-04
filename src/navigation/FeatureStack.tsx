import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../types/index";
import FeaturesScreen from "../screens/Home/FeaturesScreen";
import { headerWithoutBack } from "./shared/navigationOptions";
import { renderSharedStackScreens } from "./shared/sharedStackScreens";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function FeatureStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Features"
        component={FeaturesScreen}
        options={{ title: "Chức năng", ...headerWithoutBack }}
      />

      {renderSharedStackScreens(Stack)}
    </Stack.Navigator>
  );
}
