import { useState } from "react";
import type { Field, ReferenceDataMap } from "../../types/index";

const ASSET_REFERENCE_PAGE_SIZE = 20;

export function useAssetFormState() {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [enumData, setEnumData] = useState<Record<string, any[]>>({});
  const [referenceData, setReferenceData] = useState<
    ReferenceDataMap
  >({});

  const [modalVisible, setModalVisible] = useState(false);
  const [activeEnumField, setActiveEnumField] = useState<Field | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const [images, setImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {}
  );

  const [refPage, setRefPage] = useState(0);
  const [refKeyword, setRefKeyword] = useState("");
  const [referenceErrorMessage, setReferenceErrorMessage] = useState<
    string | null
  >(null);
  const [refLoadingMore, setRefLoadingMore] = useState(false);
  const [refHasMore, setRefHasMore] = useState(true);
  const [refSearching, setRefSearching] = useState(false);

  return {
    activeEnumField,
    enumData,
    formData,
    images,
    loadingImages,
    modalVisible,
    pageSize: ASSET_REFERENCE_PAGE_SIZE,
    refHasMore,
    refKeyword,
    refLoadingMore,
    refPage,
    refSearching,
    referenceData,
    referenceErrorMessage,
    setActiveEnumField,
    setEnumData,
    setFormData,
    setImages,
    setLoadingImages,
    setModalVisible,
    setRefHasMore,
    setRefKeyword,
    setRefLoadingMore,
    setRefPage,
    setRefSearching,
    setReferenceData,
    setReferenceErrorMessage,
    setValidationErrors,
    validationErrors,
  };
}
