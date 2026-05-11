import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { C } from "../../../utils/helpers/colors";

type SettingPasswordInputProps = {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
};

export default function SettingPasswordInput({
  placeholder,
  value,
  onChangeText,
}: SettingPasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#BCC4CE"
        secureTextEntry={!show}
        value={value}
        onChangeText={onChangeText}
      />
      <TouchableOpacity onPress={() => setShow((current) => !current)} style={styles.eye}>
        <Ionicons
          name={show ? "eye-off-outline" : "eye-outline"}
          size={18}
          color="#AAB2BC"
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
    paddingHorizontal: 16,
    backgroundColor: "#F7F9FC",
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    color: C.text,
  },
  eye: {
    padding: 4,
  },
});
