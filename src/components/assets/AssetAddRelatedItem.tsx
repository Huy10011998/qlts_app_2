import React, { useMemo, useEffect, useState } from "react";
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
import { AssetAddRelatedItemNavigationProp, Field } from "../../types/Index";
import { TypeProperty } from "../../utils/Enum";
import Ionicons from "react-native-vector-icons/Ionicons";
import EnumAndReferencePickerModal from "../modal/EnumAndReferencePickerModal";
import IsLoading from "../ui/IconLoading";
import { useNavigation } from "@react-navigation/native";
import { handleCascadeChange } from "../../utils/cascade/Index";
import { fetchEnumByField } from "../../utils/fetchField/FetchEnumField";
import { fetchImage, pickImage } from "../../utils/Image";
import { RenderInputByType } from "../form/RenderInputByType";
import { useImageLoader } from "../../hooks/useImageLoader";
import {
  getParentValue,
  insert,
  tuDongTang,
} from "../../services/data/CallApi";

import { useSelector } from "react-redux";
import { RootState } from "../../store/Index";
import { setShouldRefreshList } from "../../store/AssetSlice";
import { usePermission } from "../../hooks/usePermission";

import {
  formatDateForBE,
  formatDMY,
  getDefaultValueForField,
} from "../../utils/Date";

import { ParseFieldActive } from "../../utils/parser/ParseFieldActive";
import { GroupFields } from "../../utils/parser/GroupFields";
import { ToggleGroupUtil } from "../../utils/parser/ToggleGroup";
import { fetchReferenceByField } from "../../utils/fetchField/FetchReferenceField";
import { useAppDispatch } from "../../store/Hooks";

export default function AssetAddRelatedItem() {
  const { field, nameClass, propertyClass, idRoot, nameClassRoot } =
    useParams();

  console.log("propertyClass", propertyClass);

  const navigation = useNavigation<AssetAddRelatedItemNavigationProp>();

  // Parse fields safely
  const fieldActive = useMemo(() => ParseFieldActive(field), [field]);

  // grouped by groupLayout (kept as-is style D)
  const groupedFields = useMemo(() => GroupFields(fieldActive), [fieldActive]);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  const [enumData, setEnumData] = useState<Record<string, any[]>>({});
  const [referenceData, setReferenceData] = useState<Record<string, any[]>>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [activeEnumField, setActiveEnumField] = useState<Field | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [images, setImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {},
  );

  //Check Permission
  const { can } = usePermission();

  // Lấy node từ redux
  const dispatch = useAppDispatch();
  const { selectedTreeValue, selectedTreeProperty } = useSelector(
    (state: RootState) => state.asset,
  );

  const rawTreeValues = useMemo(() => {
    if (!selectedTreeValue) return [];
    return selectedTreeValue.split(",").map((v) => v.trim());
  }, [selectedTreeValue]);

  // Khi chọn cây → set giá trị cha vào form
  useEffect(() => {
    if (!selectedTreeProperty || !selectedTreeValue) return;

    const props = selectedTreeProperty.split(",");
    const rawValues = selectedTreeValue.split(",");

    props.forEach((p, i) => {
      const f = fieldActive.find((fi) => fi.name === p);
      if (!f) return;

      const raw = rawValues[i];
      if (raw == null) return;

      const numVal = Number(raw);
      if (!isNaN(numVal) && numVal < 0) return;

      handleChange(f.name, String(numVal)); // gọi handleChange thay vì setFormData trực tiếp
    });

    // Clear referenceData trước khi cascade chạy
    setReferenceData({});
  }, [selectedTreeProperty, selectedTreeValue, fieldActive]);

  // Expand group mặc định
  useEffect(() => {
    const next: Record<string, boolean> = {};
    Object.keys(groupedFields).forEach((k) => (next[k] = false));
    setCollapsedGroups(next);
  }, [groupedFields]);

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ToggleGroupUtil(prev, groupName));
  };

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

  // Auto tăng mã
  useEffect(() => {
    if (!propertyClass?.isTuDongTang || !nameClass) return;

    const fieldName = propertyClass.propertyTuDongTang;
    if (!fieldName) return;

    if (formData[fieldName] != null) return;

    const parentProps = propertyClass.prentTuDongTang?.split(",") || [];
    const validParentValues = parentProps
      .map((_prop: any, idx: string | number) =>
        Number(rawTreeValues[Number(idx)]),
      )
      .filter((v: number) => !isNaN(v) && v >= 0)
      .join(",");

    tuDongTang(nameClass, {
      propertyTuDongTang: fieldName,
      formatTuDongTang: propertyClass.formatTuDongTang,
      prentTuDongTang: propertyClass.prentTuDongTang,
      prentTuDongTang_Value: validParentValues,
      prefix: propertyClass.prefix,
    }).then((autoRes) => {
      if (autoRes?.data) {
        setFormData((prev) => ({
          ...prev,
          [fieldName]: autoRes.data,
        }));
      }
    });
  }, [rawTreeValues, selectedTreeValue, propertyClass, nameClass]);

  // default ngày và thời gian
  useEffect(() => {
    const mode = "add";

    if (mode !== "add") return;

    setFormData((prev) => {
      const next = { ...prev };

      fieldActive.forEach((f) => {
        if (
          f.typeProperty === TypeProperty.Date &&
          f.defaultDateNow &&
          !next[f.name]
        ) {
          next[f.name] = formatDMY(new Date());
        }

        if (
          f.typeProperty === TypeProperty.Time &&
          f.defaultTimeNow &&
          !next[f.name]
        ) {
          const now = new Date();
          next[f.name] = `${String(now.getHours()).padStart(2, "0")}:${String(
            now.getMinutes(),
          ).padStart(2, "0")}`;
        }
      });

      return next;
    });
  }, [fieldActive]);

  useEffect(() => {
    if (!idRoot || !nameClassRoot || !nameClass) return;

    let isMounted = true;

    const fetchData = async () => {
      try {
        const payload = {
          idClass: idRoot,
          nameClass: nameClassRoot,
          nameReference: nameClass,
        };

        const res = await getParentValue(nameClassRoot, payload);
        if (!isMounted || !res?.data) return;

        const { parentsFields, parentsValues } = res.data;

        if (!Array.isArray(parentsFields)) return;

        // STEP 1: load reference trước
        for (let i = 0; i < parentsFields.length; i++) {
          const fieldName = parentsFields[i];
          const f = fieldActive.find((fi) => fi.name === fieldName);

          if (f?.typeProperty === TypeProperty.Reference && f.referenceName) {
            await fetchReferenceByField(
              f.referenceName,
              f.name,
              setReferenceData,
            );
          }
        }

        // STEP 2: set value sau khi đã có options
        parentsFields.forEach((fieldName: string, index: number) => {
          const rawValue = parentsValues[index];
          if (rawValue == null) return;

          handleChange(fieldName, Number(rawValue));
        });
      } catch (err) {
        console.warn("[getParentValue] failed:", err);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [idRoot, nameClassRoot, nameClass, fieldActive]);

  useImageLoader({
    fieldActive,
    formData,
    fetchImage,
    setImages,
    setLoadingImages,
  });

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
    if (nameClass && !can(nameClass, "Insert")) {
      Alert.alert("Không có quyền", "Bạn không có quyền tạo mới dữ liệu!");
      return;
    }
    if (!Object.keys(formData).length) {
      Alert.alert("Thông báo", "Vui lòng nhập ít nhất một trường!");
      return;
    }

    if (!nameClass) {
      Alert.alert("Lỗi", "Không xác định được danh mục!");
      return;
    }

    try {
      setIsSubmitting(true);

      const payloadData = { ...formData };

      // Format date
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

      Alert.alert(
        "Thành công",
        "Tạo mới thành công!",
        [
          {
            text: "OK",
            onPress: () => {
              setFormData({});
              setImages({});

              dispatch(setShouldRefreshList(true));
              navigation.goBack();
            },
          },
        ],
        { cancelable: false },
      );
    } catch (err) {
      Alert.alert("Lỗi", "Không thể tạo mới!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
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
                      <Text style={styles.label}>{f.moTa}</Text>
                      <RenderInputByType
                        f={f}
                        formData={formData}
                        enumData={enumData}
                        referenceData={referenceData}
                        handleChange={handleChange}
                        setLoadingImages={setLoadingImages}
                        loadingImages={loadingImages}
                        pickImage={pickImage}
                        mode="add"
                        styles={styles}
                        setModalVisible={setModalVisible}
                        setActiveEnumField={setActiveEnumField}
                        getDefaultValueForField={getDefaultValueForField}
                        images={images}
                        setImages={setImages}
                      />
                    </View>
                  );
                })}
            </View>
          );
        })}

        <TouchableOpacity
          style={[
            styles.createButton,
            nameClass &&
              !can(nameClass, "Insert") && { backgroundColor: "#ccc" },
          ]}
          onPress={handleCreate}
          disabled={!!nameClass && !can(nameClass, "Insert")}
        >
          <Text style={styles.createButtonText}>Tạo</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Picker Modal */}
      <EnumAndReferencePickerModal
        visible={modalVisible}
        title={`${activeEnumField?.moTa || activeEnumField?.name}`}
        items={
          activeEnumField
            ? [
                { value: "", text: `${activeEnumField.moTa}` },
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

      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <IsLoading size="large" color="#FF3333" />
        </View>
      )}
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
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, color: "#333" },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    paddingVertical: 12,
    color: "#333",
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
});
