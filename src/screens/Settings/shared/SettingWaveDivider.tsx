import React from "react";
import { Dimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { C } from "../../../utils/helpers/colors";

const { width: W } = Dimensions.get("window");

export default function SettingWaveDivider() {
  return (
    <View style={{ height: 56, backgroundColor: C.red }}>
      <Svg
        width={W}
        height={56}
        viewBox={`0 0 ${W} 56`}
        style={{ position: "absolute", bottom: 0 }}
      >
        <Path
          d={`M0,14 C${W * 0.15},42 ${W * 0.35},0 ${W * 0.5},22 C${W * 0.65},44 ${
            W * 0.82
          },6 ${W},28 L${W},56 L0,56 Z`}
          fill={C.bg}
        />
      </Svg>
    </View>
  );
}
