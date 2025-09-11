import React, { useEffect, useRef } from "react";
import { TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSearch } from "@/context/SearchContext";
import { SearchInputProps } from "@/types";

export function SearchIcon() {
  const { toggleSearch } = useSearch();

  return (
    <TouchableOpacity onPress={toggleSearch} style={{ paddingHorizontal: 10 }}>
      <Ionicons name="search" size={22} color="#fff" />
    </TouchableOpacity>
  );
}

export function SearchInput({ visible, value, onChange }: SearchInputProps) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <TextInput
      ref={inputRef}
      placeholder="Tìm kiếm..."
      value={value}
      onChangeText={onChange}
      style={styles.searchBox}
    />
  );
}

const styles = StyleSheet.create({
  searchBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    margin: 12,
    backgroundColor: "#fff",
  },
});
