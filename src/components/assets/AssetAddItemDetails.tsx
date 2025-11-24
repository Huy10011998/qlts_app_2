import React, { useMemo, useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useParams } from "../../hooks/useParams";
import { AssetAddItemNavigationProp, Field } from "../../types/Index";
import { TypeProperty } from "../../utils/Enum";
import Ionicons from "react-native-vector-icons/Ionicons";
import { insert } from "../../services/data/CallApi";
import EnumPickerModal from "../modal/EnumPickerModal";
import { log } from "../../utils/Logger";
import IsLoading from "../ui/IconLoading";
import { useNavigation } from "@react-navigation/native";
import { formatDateForBE, getDefaultValueForField } from "../../utils/Helper";
import { handleCascadeChange } from "../../utils/cascade";
import { fetchEnumByField } from "../../utils/FetchEnumField";
import { fetchReferenceByField } from "../../utils/FetchReferenceField";
import { parseFieldActive } from "../../utils/parser/parseFieldActive";
import { groupFields } from "../../utils/parser/groupFields";
import { pickImage } from "../../utils/Image";
import { RenderInputByType } from "../form/RenderInputByType";

export default function AssetAddItemDetails() {
  const { field, nameClass, onCreated } = useParams();
  const navigation = useNavigation<AssetAddItemNavigationProp>();

  // parse fields safely
  const fieldActive = useMemo(() => parseFieldActive(field), [field]);

  // grouped by groupLayout (kept as-is style D)
  const groupedFields = useMemo(() => groupFields(fieldActive), [fieldActive]);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [enumData, setEnumData] = useState<Record<string, any[]>>({});
  const [referenceData, setReferenceData] = useState<Record<string, any[]>>({});

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

  // Load enum & reference basic
  useEffect(() => {
    fieldActive.forEach((f) => {
      if (f.typeProperty === TypeProperty.Enum && f.enumName) {
        fetchEnumByField(f.enumName, f.name, setEnumData);
      }

      if (
        f.typeProperty === TypeProperty.Reference &&
        f.referenceName &&
        !f.parentsFields
      ) {
        fetchReferenceByField(f.referenceName, f.name, setReferenceData);
      }
    });
  }, [fieldActive]);

  const handleChange = (name: string, value: any) => {
    handleCascadeChange({
      name,
      value,
      fieldActive,
      setFormData,
      setReferenceData,
    });
  };

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
      log(e);
      setIsSubmitting(false);
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
                    <RenderInputByType
                      f={f}
                      formData={formData}
                      enumData={enumData}
                      referenceData={referenceData}
                      handleChange={handleChange}
                      pickImage={pickImage}
                      mode="add"
                      styles={styles}
                      setModalVisible={setModalVisible}
                      setActiveEnumField={setActiveEnumField}
                      getDefaultValueForField={getDefaultValueForField}
                    />
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
