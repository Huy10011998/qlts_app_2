import React, { useEffect, useMemo, useState, useCallback } from "react";
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
import Ionicons from "react-native-vector-icons/Ionicons";

import { AssetEditItemNavigationProp, Field } from "../../types/Index";
import { TypeProperty } from "../../utils/Enum";
import EnumAndReferencePickerModal from "../modal/EnumAndReferencePickerModal";
import { getMatchedKey } from "../../utils/Helper";
import { useParams } from "../../hooks/useParams";
import { fetchImage, pickImage } from "../../utils/Image";
import { fetchReferenceByFieldWithParent } from "../../utils/cascade/FetchReferenceByFieldWithParent";
import { handleCascadeChange } from "../../utils/cascade/Index";
import { fetchEnumByField } from "../../utils/fetchField/FetchEnumField";
import { RenderInputByType } from "../form/RenderInputByType";
import { useImageLoader } from "../../hooks/useImageLoader";
import { update } from "../../services/data/CallApi";
import { useNavigation } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../store";
import { setShouldRefreshDetails } from "../../store/AssetSlice";

import {
  formatDateForBE,
  getDefaultValueForField,
  normalizeDateFromBE,
} from "../../utils/Date";

import { ParseFieldActive } from "../../utils/parser/ParseFieldActive";
import { GroupFields } from "../../utils/parser/GroupFields";
import { ToggleGroupUtil } from "../../utils/parser/ToggleGroup";
import { fetchReferenceByField } from "../../utils/fetchField/FetchReferenceField";

// Main Component
export default function AssetEditItem() {
  const { item, field, nameClass } = useParams();

  const navigation = useNavigation<AssetEditItemNavigationProp>();

  // parse fields safely
  const fieldActive = useMemo(() => ParseFieldActive(field), [field]);
  // grouped by groupLayout (kept as-is style D)
  const groupedFields = useMemo(() => GroupFields(fieldActive), [fieldActive]);

  // states
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [originalItem, setOriginalItem] = useState<Record<string, any>>(
    item ? { ...item } : {}
  );
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [enumData, setEnumData] = useState<Record<string, any[]>>({});
  const [referenceData, setReferenceData] = useState<Record<string, any[]>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [activeEnumField, setActiveEnumField] = useState<Field | null>(null);
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {}
  );
  const [images, setImages] = useState<Record<string, string>>({});

  // Redux
  const dispatch = useDispatch<AppDispatch>();

  // init collapsed
  useEffect(() => {
    const next: Record<string, boolean> = {};
    Object.keys(groupedFields).forEach((k) => (next[k] = false));
    setCollapsedGroups(next);
  }, [groupedFields]);

  // initialize formData using smart mapping (exact -> normalize -> fallback)
  useEffect(() => {
    const initial: Record<string, any> = {};
    if (!fieldActive || !fieldActive.length) {
      setFormData(item ? { ...item } : {});
      setOriginalItem(item ? { ...item } : {});
      return;
    }

    fieldActive.forEach((f) => {
      const name = f.name;
      const matchedKey = getMatchedKey(item || {}, name);
      const raw = matchedKey ? item?.[matchedKey] : undefined;

      // map based on property type
      switch (f.typeProperty) {
        case TypeProperty.Date:
          initial[name] = raw ? normalizeDateFromBE(raw) : "";
          break;
        case TypeProperty.Bool:
          initial[name] =
            raw === true || raw === 1 || raw === "1"
              ? true
              : raw === false || raw === 0 || raw === "0"
              ? false
              : !!raw;
          break;
        case TypeProperty.Int:
        case TypeProperty.Decimal:
          initial[name] = raw != null && raw !== "" ? raw : "";
          break;
        case TypeProperty.Enum:
          initial[name] = raw != null ? raw : "";
          break;
        case TypeProperty.Reference: {
          const rawText =
            (matchedKey && item?.[`${matchedKey}_MoTa`]) ??
            item?.[`${name}_MoTa`] ??
            item?.[`${f.name}_MoTa`] ??
            "";

          // set ID
          initial[name] = raw ?? "";

          // set MoTa (bắt buộc)
          initial[`${name}_MoTa`] = rawText ?? "";

          break;
        }

        case TypeProperty.Image:
          if (raw && raw !== "---") {
            initial[name] = raw; // ⚡ LƯU GIÁ TRỊ THẬT
            fetchImage(name, raw, setLoadingImages, setImages);
          } else {
            initial[name] = ""; // không có ảnh
          }
          break;

        default:
          initial[name] = raw != null ? raw : "";
      }
    });

    setFormData(initial);
    setOriginalItem(item ? { ...item } : {});
  }, [fieldActive, item]);

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ToggleGroupUtil(prev, groupName));
  };

  useEffect(() => {
    fieldActive.forEach((f) => {
      if (f.typeProperty === TypeProperty.Enum && f.enumName)
        fetchEnumByField(f.enumName, f.name, setEnumData);
      if (
        f.typeProperty === TypeProperty.Reference &&
        f.referenceName &&
        !f.parentsFields
      )
        fetchReferenceByField(f.referenceName, f.name, setReferenceData);
    });
  }, [fieldActive]);

  // Auto load reference có parent khi mở màn hình EDIT
  useEffect(() => {
    fieldActive.forEach((f) => {
      if (f.typeProperty === TypeProperty.Reference && f.parentsFields) {
        const parents = f.parentsFields.split(","); // ["ID_Complex", "ID_Building"]
        const haveAllParents = parents.every((p) => formData[p]); // check từng field có value

        if (haveAllParents) {
          const parentValues = parents.map((p) => formData[p]).join(",");
          fetchReferenceByFieldWithParent(
            f.referenceName!,
            f.name,
            parentValues,
            setReferenceData
          );
        }
      }
    });
  }, [formData]); // chạy khi formData được set từ item lúc mở màn hình

  // load image khi giá trị thay đổi
  useImageLoader({
    fieldActive,
    formData,
    fetchImage,
    setImages,
    setLoadingImages,
  });

  // handle change & cascade
  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    handleCascadeChange({
      name,
      value,
      fieldActive,
      setFormData,
      setReferenceData,
    });
  };

  const handleUpdate = async () => {
    try {
      if (!originalItem?.id) {
        Alert.alert("Lỗi", "Không tìm thấy ID để cập nhật!");
        return;
      }

      const entity: Record<string, any> = {};

      fieldActive.forEach((f) => {
        const key = f.name;
        const value = formData[key];

        switch (f.typeProperty) {
          // DATE
          case TypeProperty.Date:
            entity[key] = value ? formatDateForBE(value) : null;
            break;

          // NUMBER (INT / DECIMAL)
          case TypeProperty.Int:
          case TypeProperty.Decimal:
            entity[key] =
              value === "" || value === null || value === undefined
                ? null
                : Number(value);
            break;

          // TEXT / STRING
          case TypeProperty.Text:
          case TypeProperty.String:
            entity[key] =
              value === "" || value === null || value === undefined
                ? null
                : value;
            break;

          // ENUM / REFERENCE
          case TypeProperty.Enum:
          case TypeProperty.Reference:
            entity[key] =
              value === "" || value === null || value === undefined
                ? null
                : value;
            break;

          // IMAGE
          case TypeProperty.Image:
            if (value === "---") {
              // người dùng bấm nút X xoá ảnh
              entity[key] = "";
            } else {
              entity[key] =
                value === "" || value === null || value === undefined
                  ? null
                  : value;
            }
            break;

          // DEFAULT
          default:
            entity[key] =
              value === "" || value === null || value === undefined
                ? null
                : value;
        }
      });

      // XOÁ field _MoTa khỏi payload (Reference)
      Object.keys(entity).forEach((k) => {
        if (k.endsWith("_MoTa")) delete entity[k];
      });

      const body = {
        entity,
        iDs: [originalItem.id],
        lstIncludeProperties: [],
        lstExcludeProperties: [],
        saveHistory: true,
      };

      if (!nameClass) {
        Alert.alert("Lỗi", "Không tìm thấy nameClass để update!");
        return;
      }

      await update(nameClass, body);

      Alert.alert("Thành công", "Cập nhật thành công!", [
        {
          text: "OK",
          onPress: () => {
            setFormData({});
            setImages({});

            // báo detail reload lại
            dispatch(setShouldRefreshDetails(true));
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      Alert.alert("Lỗi", "Không thể cập nhật dữ liệu!");
    }
  };

  // reset
  const handleReset = () => {
    if (!originalItem) return;

    const reset: Record<string, any> = {};

    fieldActive.forEach((f) => {
      const matchedKey = getMatchedKey(originalItem || {}, f.name);
      const raw = matchedKey ? originalItem[matchedKey] : undefined;

      switch (f.typeProperty) {
        case TypeProperty.Date:
          reset[f.name] = raw ? normalizeDateFromBE(raw) : "";
          break;

        case TypeProperty.Image:
          reset[f.name] = raw ?? "";
          break;

        case TypeProperty.Link:
          reset[f.name] = raw ?? "";
          break;

        case TypeProperty.Reference:
          const rawText =
            (matchedKey && originalItem?.[`${matchedKey}_MoTa`]) ??
            originalItem?.[`${f.name}_MoTa`];
          reset[f.name] = raw != null ? raw : rawText ?? "";
          break;

        default:
          reset[f.name] = raw != null ? raw : "";
      }
    });

    // Update formData trước
    setFormData(reset);

    // xử lý image preview sau
    fieldActive.forEach((f) => {
      const matchedKey = getMatchedKey(originalItem || {}, f.name);
      const raw = matchedKey ? originalItem[matchedKey] : undefined;

      if (f.typeProperty === TypeProperty.Image) {
        if (!raw || raw === "---") {
          setImages((p) => ({ ...p, [f.name]: "" }));
          return; // stop
        }

        fetchImage(f.name, raw, setLoadingImages, setImages);
      }
    });
  };

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
                  size={26}
                  color={"#FF3333"}
                />
              </TouchableOpacity>

              {!collapsed &&
                fields.map((f) => {
                  if (f.isReadOnly) return null; // ẨN TOÀN BỘ FIELD

                  return (
                    <View key={f.id ?? f.name} style={styles.fieldBlock}>
                      <Text style={styles.label}>{f.moTa ?? f.name}</Text>
                      <RenderInputByType
                        f={f}
                        formData={formData}
                        enumData={enumData}
                        referenceData={referenceData}
                        images={images}
                        setLoadingImages={setLoadingImages}
                        loadingImages={loadingImages}
                        handleChange={handleChange}
                        pickImage={pickImage}
                        setImages={setImages}
                        mode="edit"
                        styles={styles}
                        setModalVisible={setModalVisible}
                        setActiveEnumField={setActiveEnumField}
                        getDefaultValueForField={getDefaultValueForField}
                      />
                    </View>
                  );
                })}
            </View>
          );
        })}

        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            style={[styles.updateButton, { flex: 1 }]}
            onPress={handleUpdate}
          >
            <Text style={styles.updateButtonText}>Cập nhật</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resetButton, { flex: 1 }]}
            onPress={() =>
              Alert.alert(
                "Xác nhận",
                "Bạn muốn đặt lại mọi thay đổi về giá trị ban đầu?",
                [
                  { text: "Huỷ", style: "cancel" },
                  { text: "Đặt lại", onPress: handleReset },
                ]
              )
            }
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <EnumAndReferencePickerModal
        visible={modalVisible}
        title={`${activeEnumField?.moTa ?? ""}`}
        items={
          activeEnumField
            ? [
                {
                  value: "",
                  text: `${activeEnumField.moTa ?? activeEnumField.name}`,
                },
                ...(activeEnumField.typeProperty === TypeProperty.Reference
                  ? referenceData[activeEnumField.name] || []
                  : enumData[activeEnumField.name] || []),
              ]
            : []
        }
        onClose={() => setModalVisible(false)}
        onSelect={(value) => {
          if (activeEnumField) {
            let finalValue: any = value;
            if (value === "") finalValue = "";
            else if (!isNaN(value)) finalValue = Number(value);
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

  groupTitle: { fontSize: 16, fontWeight: "700", color: "#FF3333" },
  fieldBlock: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  updateButton: {
    backgroundColor: "#FF3333",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  updateButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  resetButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FF3333",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },

  resetButtonText: { color: "#FF3333", fontSize: 16, fontWeight: "700" },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  textArea: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    minHeight: 100,
    fontSize: 14,
    color: "#000",
    backgroundColor: "#fff",
    textAlignVertical: "top",
  },

  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#FF3333",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginTop: 6,
  },

  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#f2f2f2",
  },

  removeImageButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 4,
    borderRadius: 20,
  },
});
