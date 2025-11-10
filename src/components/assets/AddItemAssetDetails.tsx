import React, { useMemo, useEffect, useState, useCallback, JSX } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useParams } from "../../hooks/useParams";
import { Field } from "../../types/Index";
import { TypeProperty } from "../../utils/Enum";
import Ionicons from "react-native-vector-icons/Ionicons";
import IsLoading from "../ui/IconLoading";
import { DatePickerIOS } from "../datePickerIOS/DatePicker";

export default function AssetAddItemDetails() {
  const { field } = useParams();

  const fieldActive: Field[] = useMemo(() => {
    try {
      if (!field) return [];
      let parsed = typeof field === "string" ? JSON.parse(field) : field;
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Lỗi parse field:", error);
      return [];
    }
  }, [field]);

  const groupedFields = useMemo(() => {
    return fieldActive.reduce<Record<string, Field[]>>((groups, f) => {
      const groupName = f.groupLayout?.trim() || "Thông tin chung";
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(f);
      return groups;
    }, {});
  }, [fieldActive]);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    Object.keys(groupedFields).forEach((k) => (next[k] = false));
    setCollapsedGroups(next);
  }, [groupedFields]);

  const toggleGroup = useCallback(
    (groupName: string) =>
      setCollapsedGroups((prev) => ({
        ...prev,
        [groupName]: !prev[groupName],
      })),
    []
  );

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = () => {
    if (Object.keys(formData).length === 0) {
      Alert.alert("Thông báo", "Vui lòng nhập ít nhất một trường thông tin!");
      return;
    }

    console.log("📦 Dữ liệu gửi lên:", formData);
    Alert.alert("Thành công", "Tạo mới thành công!");
  };

  if (!fieldActive.length) {
    return <IsLoading size="large" color="#FF3333" />;
  }

  const renderInputByType = (f: Field) => {
    const value = formData[f.name] || "";
    let inputElement: JSX.Element;

    switch (f.typeProperty) {
      case TypeProperty.Int:
      case TypeProperty.Decimal:
        inputElement = (
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder={`Nhập ${f.moTa || f.name}`}
            value={String(value)}
            onChangeText={(t) => handleChange(f.name, t)}
          />
        );
        break;

      case TypeProperty.Bool:
        inputElement = (
          <View style={styles.switchRow}>
            <Switch
              value={!!value}
              onValueChange={(v) => handleChange(f.name, v)}
            />
            <Text>{value ? "Có" : "Không"}</Text>
          </View>
        );
        break;

      case TypeProperty.Date:
        inputElement = (
          <DatePickerIOS
            value={value}
            onChange={(date) => handleChange(f.name, date)}
          />
        );
        break;

      default:
        inputElement = (
          <TextInput
            style={styles.input}
            placeholder={`Nhập ${f.moTa || f.name}`}
            value={String(value)}
            onChangeText={(t) => handleChange(f.name, t)}
            placeholderTextColor="#999"
          />
        );
    }

    return <View>{inputElement}</View>;
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {Object.entries(groupedFields).map(([groupName, fields]) => {
          const isCollapsed = !!collapsedGroups[groupName];
          return (
            <View key={groupName} style={styles.groupCard}>
              <TouchableOpacity
                style={styles.groupHeader}
                onPress={() => toggleGroup(groupName)}
                activeOpacity={0.7}
              >
                <Text style={styles.groupTitle}>{groupName}</Text>
                <Ionicons
                  name={isCollapsed ? "chevron-down" : "chevron-up"}
                  size={26}
                  color="#222"
                />
              </TouchableOpacity>

              {!isCollapsed &&
                fields.map((f) => (
                  <View key={f.id ?? f.name} style={styles.fieldBlock}>
                    <Text style={styles.label}>{f.moTa || f.name}</Text>
                    {renderInputByType(f)}
                  </View>
                ))}
            </View>
          );
        })}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
            <Text style={styles.createButtonText}>Tạo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },

  groupCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    marginBottom: 12,
  },

  groupTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF3333",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fafafa",
  },

  fieldBlock: {
    marginBottom: 14,
  },

  label: {
    fontWeight: "600",
    color: "#000",
    fontSize: 14,
    marginBottom: 6,
  },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  footer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 6,
    elevation: 10,
  },

  createButton: {
    backgroundColor: "#FF3333",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
