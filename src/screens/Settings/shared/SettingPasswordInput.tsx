import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { C } from "../../../utils/helpers/colors";
import { COMPACT_TEXT_MAX_SCALE } from "../../../utils/helpers/textScaling";

type SettingPasswordInputProps = {
  hasError?: boolean;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
};

export default function SettingPasswordInput({
  hasError = false,
  placeholder,
  value,
  onChangeText,
}: SettingPasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <View style={[styles.wrap, hasError && styles.wrapError]}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={hasError ? C.red : "#BCC4CE"}
        secureTextEntry={!show}
        value={value}
        onChangeText={onChangeText}
        maxFontSizeMultiplier={COMPACT_TEXT_MAX_SCALE}
      />
      <TouchableOpacity
        onPress={() => setShow((current) => !current)}
        style={styles.eye}
      >
        <Ionicons
          name={show ? "eye-off-outline" : "eye-outline"}
          size={18}
          color={hasError ? C.red : "#AAB2BC"}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#EDF0F5",
    borderRadius: 14,
    marginBottom: 12,
    minHeight: 54,
    paddingHorizontal: 16,
    backgroundColor: "#F7F9FC",
  },
  wrapError: {
    borderColor: C.red,
    backgroundColor: "#FFF5F5",
  },
  input: {
    flex: 1,
    height: 54,
    paddingVertical: 0,
    fontSize: 14,
    lineHeight: 20,
    color: C.text,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  eye: {
    padding: 4,
  },
});
