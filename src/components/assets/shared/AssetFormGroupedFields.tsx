import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { RenderInputByType } from "../../form/RenderInputByType";
import { BRAND_RED } from "./listTheme";

type AssetFormGroupedFieldsProps = {
  collapsedGroups: Record<string, boolean>;
  enumData: Record<string, any[]>;
  formData: Record<string, any>;
  getDefaultValueForField: (field: any, formData?: Record<string, any>) => any;
  groupedFields: Record<string, any[]>;
  handleChange: (name: string, value: any) => void;
  images: Record<string, string>;
  loadingImages: Record<string, boolean>;
  mode: "add" | "edit" | "clone";
  openReferenceModal: (field: any) => void;
  pickImage: (...args: any[]) => void;
  referenceData: Record<string, { items: any[]; totalCount: number }>;
  setImages: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setLoadingImages: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  styles: any;
  toggleGroup: (groupName: string) => void;
  validationErrors?: Record<string, string>;
};

export default function AssetFormGroupedFields({
  collapsedGroups,
  enumData,
  formData,
  getDefaultValueForField,
  groupedFields,
  handleChange,
  images,
  loadingImages,
  mode,
  openReferenceModal,
  pickImage,
  referenceData,
  setImages,
  setLoadingImages,
  styles,
  toggleGroup,
  validationErrors = {},
}: AssetFormGroupedFieldsProps) {
  return (
    <>
      {Object.entries(groupedFields).map(([groupName, fields]) => {
        const collapsed = collapsedGroups[groupName];

        return (
          <View key={groupName} style={styles.groupCard}>
            <TouchableOpacity
              style={styles.groupHeader}
              onPress={() => toggleGroup(groupName)}
            >
              <View style={styles.groupTitleWrap}>
                <View style={styles.groupIconWrap}>
                  <Ionicons name="albums-outline" size={16} color={BRAND_RED} />
                </View>
                <Text style={styles.groupTitle}>{groupName}</Text>
              </View>
              <View style={styles.chevronWrap}>
                <Ionicons
                  name={collapsed ? "chevron-down" : "chevron-up"}
                  size={14}
                  color={BRAND_RED}
                />
              </View>
            </TouchableOpacity>

            {!collapsed &&
              fields.map((field) => {
                if (field.isReadOnly) return null;

                return (
                  <View key={field.id ?? field.name} style={styles.fieldBlock}>
                    <Text style={styles.label}>
                      {field.moTa ?? field.name}
                      {field.isRequired ? (
                        <Text style={{ color: BRAND_RED }}> *</Text>
                      ) : null}
                    </Text>
                    <RenderInputByType
                      openEnumReferanceModal={openReferenceModal}
                      f={field}
                      formData={formData}
                      enumData={enumData}
                      referenceData={referenceData}
                      validationErrors={validationErrors}
                      images={images}
                      setLoadingImages={setLoadingImages}
                      loadingImages={loadingImages}
                      handleChange={handleChange}
                      pickImage={pickImage}
                      setImages={setImages}
                      mode={mode}
                      styles={styles}
                      getDefaultValueForField={getDefaultValueForField}
                    />
                  </View>
                );
              })}
          </View>
        );
      })}
    </>
  );
}
