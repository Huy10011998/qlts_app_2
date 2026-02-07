import React, { useMemo, useState } from "react";
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
import { fetchImage, pickImage } from "../../utils/Image";
import { RenderInputByType } from "../form/RenderInputByType";
import { useImageLoader } from "../../hooks/useImageLoader";
import { getParentValue, insert } from "../../services/data/CallApi";

import { useSelector } from "react-redux";
import { RootState } from "../../store/Index";
import { setShouldRefreshList } from "../../store/AssetSlice";
import { usePermission } from "../../hooks/usePermission";

import { formatDateForBE, getDefaultValueForField } from "../../utils/Date";

import { useAppDispatch } from "../../store/Hooks";
import { useCascadeForm } from "../../hooks/AssetAddItem/useCascadeForm";
import { useDefaultDateTime } from "../../hooks/AssetAddItem/useDefaultDateTime";
import { useAutoIncrementCode } from "../../hooks/AssetAddItem/useAutoIncrementCode";
import { useEnumAndReferenceLoader } from "../../hooks/AssetAddItem/useEnumAndReferenceLoader";
import { useTreeToForm } from "../../hooks/AssetAddItem/useTreeToForm";
import { useGroupedFields } from "../../hooks/AssetAddItem/useGroupedFields";
import { useLoadParentValue } from "../../hooks/AssetAddItem/useLoadParentValue";
import { useOpenReferenceModal } from "../../hooks/AssetAddItem/useOpenReferenceModal";
import { useReferenceFetcher } from "../../hooks/AssetAddItem/useReferenceData";
import { useModalItems } from "../../hooks/AssetAddItem/useModalItems";

export default function AssetAddRelatedItem() {
  /* ===== PARAMS ===== */
  const { field, nameClass, propertyClass, idRoot, nameClassRoot } =
    useParams();
  const { can } = usePermission();
  const dispatch = useAppDispatch();

  /* ===== REDUX ===== */
  const { selectedTreeValue, selectedTreeProperty } = useSelector(
    (state: RootState) => state.asset,
  );

  /* ===== NAVIGATION ===== */
  const navigation = useNavigation<AssetAddRelatedItemNavigationProp>();

  /* ===== STATE ===== */
  const [formData, setFormData] = useState<Record<string, any>>({});

  /* ===== ENUM & REFERENCE DATA ===== */
  const [enumData, setEnumData] = useState<Record<string, any[]>>({});
  const [referenceData, setReferenceData] = useState<
    Record<string, { items: any[]; totalCount: number }>
  >({});

  /* ===== MODAL STATE ===== */
  const [modalVisible, setModalVisible] = useState(false);
  const [activeEnumField, setActiveEnumField] = useState<Field | null>(null);

  /* ===== SUBMITTING STATE ===== */
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ===== IMAGE STATE ===== */
  const [images, setImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {},
  );

  /* ===== REFERENCE LOAD MORE ===== */
  const PAGE_SIZE = 20;
  const [refPage, setRefPage] = useState(0);
  const [refKeyword, setRefKeyword] = useState("");
  const [refLoadingMore, setRefLoadingMore] = useState(false);
  const [refHasMore, setRefHasMore] = useState(true);
  const [refSearching, setRefSearching] = useState(false);

  // ===== RAW TREE VALUES ===== //
  const rawTreeValues = useMemo(() => {
    if (!selectedTreeValue) return [];
    return selectedTreeValue.split(",").map((v) => v.trim());
  }, [selectedTreeValue]);

  /* ===== GROUP + FIELD ===== */
  const { fieldActive, groupedFields, collapsedGroups, toggleGroup } =
    useGroupedFields(field);

  /* ===== CASCADE ===== */
  const { handleChange } = useCascadeForm(
    fieldActive,
    setFormData,
    setReferenceData,
  );

  /* ===== TREE → FORM ===== */
  useTreeToForm({
    selectedTreeProperty,
    selectedTreeValue,
    fieldActive,
    handleChange,
    setReferenceData,
  });

  /* ===== ENUM / REFERENCE ===== */
  useEnumAndReferenceLoader(
    fieldActive,
    setEnumData,
    setReferenceData,
    referenceData,
  );

  /* ===== AUTO INCREMENT ===== */
  const parentField = propertyClass?.prentTuDongTang;
  const parentValue = parentField ? formData[parentField] : undefined;

  useAutoIncrementCode({
    nameClass,
    propertyClass,
    formData,
    rawTreeValues,
    parentValue,
    setFormData,
  });

  /* ===== DEFAULT DATE / TIME ===== */
  useDefaultDateTime(fieldActive, setFormData);

  //   ===== LOAD PARENT VALUE ===== */
  useLoadParentValue({
    idRoot,
    nameClassRoot,
    nameClass,
    fieldActive,
    getParentValue,
    setReferenceData,
    handleChange,
  });

  /* ===== IMAGE LOADER ===== */
  useImageLoader({
    fieldActive,
    formData,
    fetchImage,
    setImages,
    setLoadingImages,
  });

  /* ===== OPEN ENUM & REFERANCE MODAL ===== */
  const { openReferenceModal } = useOpenReferenceModal({
    formData,
    setActiveEnumField,
    setRefKeyword,
    setRefPage,
    setRefHasMore,
    setModalVisible,
    setReferenceData,
    pageSize: PAGE_SIZE,
  });

  /* ===== FETCH REFERENCE DATA ON SEARCH ===== */
  const { fetchReferenceData } = useReferenceFetcher(
    setReferenceData,
    PAGE_SIZE,
  );

  // ===== MODAL ITEMS ===== //
  const modalItems = useModalItems(activeEnumField, referenceData, enumData);

  // HANDLE CREATE
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
                        openEnumReferanceModal={openReferenceModal}
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
        isSearching={refSearching}
        loadingMore={refLoadingMore}
        visible={modalVisible}
        title={`${activeEnumField?.moTa || activeEnumField?.name}`}
        items={modalItems}
        total={
          activeEnumField
            ? referenceData[activeEnumField.name]?.totalCount || 0
            : 0
        }
        loadedCount={
          activeEnumField
            ? (referenceData[activeEnumField.name]?.items ?? []).filter(
                (i) => i.value !== "",
              ).length
            : 0
        }
        onClose={() => setModalVisible(false)}
        onSelect={(value) => {
          if (activeEnumField) {
            let finalValue = value;
            if (value !== "" && !isNaN(value)) {
              finalValue = Number(value);
            }
            handleChange(activeEnumField.name, finalValue);
          }
          setModalVisible(false);
        }}
        onSearch={(textSearch) => {
          if (!activeEnumField) return;

          setRefSearching(true);
          setRefKeyword(textSearch);
          setRefPage(0);
          setRefHasMore(true);

          fetchReferenceData(activeEnumField, {
            textSearch,
            page: 0,
            append: false,
          }).finally(() => setRefSearching(false));
        }}
        onLoadMore={() => {
          if (!activeEnumField || refLoadingMore || refSearching || !refHasMore)
            return;

          const fieldName = activeEnumField.name;
          const ref = referenceData[fieldName];

          if (!ref) return;

          // guard cực mạnh
          if (!ref || ref.totalCount <= ref.items.length) {
            setRefHasMore(false);
            return;
          }

          setRefLoadingMore(true);

          fetchReferenceData(activeEnumField, {
            textSearch: refKeyword,
            page: refPage + 1,
            append: true,
          }).finally(() => {
            setRefPage((p) => p + 1);
            setRefLoadingMore(false);
          });
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

  boolRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  boolLabel: {
    flex: 1,
    paddingRight: 12,
  },

  tooltipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },

  tooltipLabel: {
    color: "#FF3333",
    fontWeight: "600",
    fontSize: 14,
  },

  tooltipText: {
    color: "#333",
    fontSize: 14,
    flexShrink: 1,
  },
});
