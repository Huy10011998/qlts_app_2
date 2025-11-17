import React, { useMemo, useEffect, useState, useCallback } from "react";
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
import { AssetAddItemNavigationProp, Field } from "../../types/Index";
import { TypeProperty } from "../../utils/Enum";
import Ionicons from "react-native-vector-icons/Ionicons";
import { DatePickerModalIOS } from "../modal/DatePickerModal";
import { callApi, insert } from "../../services/data/CallApi";
import { API_ENDPOINTS } from "../../config/Index";
import EnumPickerModal from "../modal/EnumPickerModal";
import { error, log } from "../../utils/Logger";
import IsLoading from "../ui/IconLoading";
import { useNavigation } from "@react-navigation/native";
import { formatDateForBE } from "../../utils/Helper";

export default function AssetAddItemDetails() {
  const { field, nameClass, onCreated } = useParams();
  const navigation = useNavigation<AssetAddItemNavigationProp>();

  const fieldActive: Field[] = useMemo(() => {
    try {
      if (!field) return [];

      let parsed = typeof field === "string" ? JSON.parse(field) : field;
      if (typeof parsed === "string") parsed = JSON.parse(parsed);

      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      error("Lỗi parse field:", e);
      return [];
    }
  }, [field]);

  const groupedFields = useMemo(() => {
    return fieldActive.reduce<Record<string, Field[]>>((groups, f) => {
      const groupName = f.groupLayout?.trim() || "Thông tin chung";
      (groups[groupName] ??= []).push(f);
      return groups;
    }, {});
  }, [fieldActive]);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [enumData, setEnumData] = useState<Record<string, any[]>>({});
  const [referenceData, setReference] = useState<Record<string, any[]>>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [activeEnumField, setActiveEnumField] = useState<Field | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expand group mặc định
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

  const fetchEnumByField = async (enumName: string, fieldName: string) => {
    try {
      const res = await callApi<{ success: boolean; data: any[] }>(
        "POST",
        API_ENDPOINTS.GET_CATEGORY_ENUM,
        { enumName }
      );

      setEnumData((prev) => ({
        ...prev,
        [fieldName]: Array.isArray(res.data) ? res.data : [],
      }));
    } catch (e) {
      log("Lỗi tải enum:", e);
    }
  };

  const fetchReferenceByField = async (
    referenceName: string,
    fieldName: string
  ) => {
    try {
      const res = await callApi<{ success: boolean; data: { items: any[] } }>(
        "POST",
        API_ENDPOINTS.GET_CATEGORY,
        { type: referenceName }
      );

      const items = (res.data?.items ?? []).map((x: any) => ({
        value: x.id,
        text: x.text,
        typeMulti: x.typeMulti ?? null,
      }));

      setReference((prev) => ({ ...prev, [fieldName]: items }));
    } catch (e) {
      log("Lỗi tải reference:", e);
    }
  };

  const fetchReferenceByFieldWithParent = async (
    referenceName: string,
    fieldName: string,
    parentValue: any
  ) => {
    try {
      const payload: any = {
        type: referenceName,
        currentID: [0],
      };

      if (parentValue != null) {
        payload.lstParent = Array.isArray(parentValue)
          ? parentValue.join(",")
          : String(parentValue);
      }

      const res = await callApi<{ success: boolean; data: { items: any[] } }>(
        "POST",
        API_ENDPOINTS.GET_CATEGORY,
        payload
      );

      const items = (res.data?.items ?? []).map((x: any) => ({
        value: x.id,
        text: x.text,
        typeMulti: x.typeMulti ?? null,
      }));

      setReference((prev) => ({ ...prev, [fieldName]: items }));
    } catch (e) {
      log("Lỗi cascade:", e);
    }
  };

  // Load enum & reference basic
  useEffect(() => {
    fieldActive.forEach((f) => {
      if (f.typeProperty === TypeProperty.Enum && f.enumName) {
        fetchEnumByField(f.enumName, f.name);
      }

      if (
        f.typeProperty === TypeProperty.Reference &&
        f.referenceName &&
        !f.parentsFields
      ) {
        fetchReferenceByField(f.referenceName, f.name);
      }
    });
  }, [fieldActive]);

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      const fieldCurrent = fieldActive.find((f) => f.name === name);
      if (!fieldCurrent) return updated;

      const clearCascade = (parent: string, obj: any) => {
        const parentField = fieldActive.find((f) => f.name === parent);
        if (!parentField?.cascadeClearFields) return;

        const childName = parentField.cascadeClearFields;

        obj[childName] = null;
        setReference((prev) => ({ ...prev, [childName]: [] }));

        const childField = fieldActive.find((f) => f.name === childName);
        if (childField?.referenceName) {
          const parents = childField.parentsFields?.split(",") ?? [];
          const parentValues = parents
            .map((p) => obj[p])
            .filter((x) => x != null);

          fetchReferenceByFieldWithParent(
            childField.referenceName,
            childName,
            parentValues.join(",")
          );
        }

        clearCascade(childName, obj);
      };

      if (fieldCurrent.cascadeClearFields) {
        clearCascade(name, updated);
      }

      return updated;
    });
  };
  console.log("===fieldActive", fieldActive);
  const handleCreate = async () => {
    if (Object.keys(formData).length === 0) {
      Alert.alert("Thông báo", "Vui lòng nhập ít nhất một trường!");
      return;
    }

    if (!nameClass) {
      Alert.alert("Lỗi", "Không xác định được danh mục để tạo mới!");
      return;
    }

    try {
      setIsSubmitting(true);

      // Clone để không ảnh hưởng UI
      const payloadData = { ...formData };

      // Format Date trước khi gửi BE
      fieldActive.forEach((f) => {
        if (f.typeProperty === TypeProperty.Date) {
          payloadData[f.name] = formatDateForBE(payloadData[f.name]);
        }
      });

      const payload = {
        entities: [payloadData],
        saveHistory: true,
      };

      log("INSERT PAYLOAD:", payload);

      await insert(nameClass, payload);

      // Reset form
      setFormData({});

      Alert.alert(
        "Thành công",
        "Tạo mới thành công!",
        [
          {
            text: "OK",
            onPress: () => {
              if (onCreated) onCreated(); // gọi callback báo screen trước reload
              navigation.goBack(); // sau đó mới back
            },
          },
        ],
        { cancelable: false }
      );
    } catch (e) {
      Alert.alert("Lỗi", "Không thể tạo mới!");
      console.log(e);
      setIsSubmitting(false);
    }
  };

  const renderInputByType = (f: Field) => {
    const value = formData[f.name] ?? "";

    let items: any[] = [];
    if (f.typeProperty === TypeProperty.Reference)
      items = referenceData[f.name] || [];
    if (f.typeProperty === TypeProperty.Enum) items = enumData[f.name] || [];

    switch (f.typeProperty) {
      case TypeProperty.Int:
      case TypeProperty.Decimal:
        return (
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder={`Nhập ${f.moTa}`}
            value={String(value ?? "")}
            onChangeText={(t) => handleChange(f.name, t)}
          />
        );

      case TypeProperty.Bool:
        return (
          <View style={styles.switchRow}>
            <Switch
              value={!!value}
              onValueChange={(v) => handleChange(f.name, v)}
            />
            <Text>{value ? "Có" : "Không"}</Text>
          </View>
        );

      case TypeProperty.Date:
        return (
          <DatePickerModalIOS
            value={value}
            onChange={(d) => handleChange(f.name, d)}
          />
        );

      case TypeProperty.Enum:
      case TypeProperty.Reference:
        return (
          <TouchableOpacity
            style={styles.pickerWrapper}
            onPress={() => {
              setActiveEnumField(f);
              setModalVisible(true);
            }}
          >
            <Text
              style={{
                padding: 12,
                fontSize: 14,
                color:
                  value !== null && value !== undefined && value !== ""
                    ? "#000"
                    : "#999",
              }}
            >
              {items.find((x) => x.value === value)?.text ??
                `Chọn ${f.moTa || f.name}`}
            </Text>

            <Ionicons
              name="chevron-down"
              size={20}
              color="#444"
              style={{ position: "absolute", right: 8, top: 12 }}
            />
          </TouchableOpacity>
        );

      default:
        return (
          <TextInput
            style={styles.input}
            placeholder={`Nhập ${f.moTa}`}
            value={String(value ?? "")}
            onChangeText={(t) => handleChange(f.name, t)}
          />
        );
    }
  };

  {
    isSubmitting && (
      <View style={styles.loadingOverlay}>
        <IsLoading size="large" color="#FF3333" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {Object.entries(groupedFields).map(([groupName, fields]) => {
          const collapsed = collapsedGroups[groupName];

          return (
            <View key={groupName} style={styles.groupCard}>
              <TouchableOpacity
                style={styles.groupHeader}
                onPress={() => toggleGroup(groupName)}
              >
                <Text style={styles.groupTitle}>{groupName}</Text>
                <Ionicons
                  name={collapsed ? "chevron-down" : "chevron-up"}
                  size={24}
                />
              </TouchableOpacity>

              {!collapsed &&
                fields.map((f) => (
                  <View key={f.id ?? f.name} style={styles.fieldBlock}>
                    <Text style={styles.label}>{f.moTa}</Text>
                    {renderInputByType(f)}
                  </View>
                ))}
            </View>
          );
        })}

        <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
          <Text style={styles.createButtonText}>Tạo</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Picker Modal */}
      <EnumPickerModal
        visible={modalVisible}
        title={`Chọn ${activeEnumField?.moTa || activeEnumField?.name}`}
        items={
          activeEnumField
            ? [
                { value: "", text: `Chọn ${activeEnumField.moTa}` },
                ...(activeEnumField.typeProperty === TypeProperty.Reference
                  ? referenceData[activeEnumField.name] || []
                  : enumData[activeEnumField.name] || []),
              ]
            : []
        }
        onClose={() => setModalVisible(false)}
        onSelect={(value) => {
          if (activeEnumField) {
            let finalValue = value;

            if (value === "") {
              finalValue = "";
            } else if (!isNaN(value)) {
              finalValue = Number(value);
            }

            handleChange(activeEnumField.name, finalValue);
          }

          setModalVisible(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  groupCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF3333",
  },
  fieldBlock: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  createButton: {
    backgroundColor: "#FF3333",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  createButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
});
