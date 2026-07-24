import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppState,
  AppStateStatus,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Orientation from "react-native-orientation-locker";
import { WebView } from "react-native-webview";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import RNFS from "react-native-fs";
import Share from "react-native-share";
import type {
  Field,
  ReferenceDataMap,
  ReportConfigParameter,
  ReportViewProps,
} from "../../types";
import { getPreviewBC } from "../../services/data/callApi";
import { error, log } from "../../utils/Logger";
import { formatDateForBE } from "../../utils/Date";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useColorScheme } from "../../hooks/useColorScheme";
import {
  C,
  useHairlineBorderColor,
  useStrongBorderColor,
} from "../../utils/helpers/colors";
import { styles } from "./ReportView.styles";
import {
  parseReportDate,
  getReportFileInfo,
  sanitizeShareFileName,
  formatShareTimestamp,
  SHARE_REPORT_OPTIONS,
  REPORT_PREVIEW_TIMEOUT_MS,
  REPORT_SLOW_LOADING_MS,
  buildReportHtml,
  getInitialParameterValue,
  buildInitialParameterValues,
  normalizeReportPayloadKey,
  normalizeReportPayloadValue,
  mapReportParameterToField,
  createDefaultReportConfig,
  type ShareReportOption,
} from "./ReportView.helpers";
import { TypeProperty } from "../../utils/Enum";
import { RenderInputByType } from "../form/RenderInputByType";
import { useEnumAndReferenceLoader } from "../../hooks/AssetAddItem/useEnumAndReferenceLoader";
import { useModalItems } from "../../hooks/AssetAddItem/useModalItems";
import AssetFormReferencePickerModal from "../assets/shared/AssetFormReferencePickerModal";
import BottomSheetModalShell from "../shared/BottomSheetModalShell";
import { HeaderDetailsModalHeader } from "../header/HeaderDetails";
import { handleCascadeChange } from "../../utils/cascade";
import {
  buildReferenceFetchParams,
  getCurrentReferenceIds,
  loadReferenceItemsForField,
} from "../../hooks/AssetAddItem/referenceLoaderHelpers";

const ReportView: React.FC<ReportViewProps> = ({
  title,
  config,
  previewEndpoint,
  onClose,
}) => {
  const isDark = useColorScheme() === "dark";
  const hairlineBorderColor = useHairlineBorderColor();
  const strongBorderColor = useStrongBorderColor();
  const reportConfig = useMemo(
    () => config ?? createDefaultReportConfig(title),
    [config, title]
  );
  const activeParameters = useMemo(
    () =>
      [...(reportConfig.parameters ?? [])]
        .filter((parameter) => parameter.isActive)
        .sort((a, b) => Number(a.stt) - Number(b.stt)),
    [reportConfig.parameters]
  );
  const parameterFields = useMemo(
    () => activeParameters.map(mapReportParameterToField),
    [activeParameters]
  );
  const [parameterValues, setParameterValues] = useState<Record<string, any>>(
    () => buildInitialParameterValues(activeParameters)
  );
  const [enumData, setEnumData] = useState<Record<string, any[]>>({});
  const [referenceData, setReferenceData] = useState<
    ReferenceDataMap
  >({});
  const [modalVisible, setModalVisible] = useState(false);
  const [activeEnumField, setActiveEnumField] = useState<Field | null>(null);
  const [referenceErrorMessage, setReferenceErrorMessage] = useState<
    string | null
  >(null);
  const [refPage, setRefPage] = useState(0);
  const [refKeyword, setRefKeyword] = useState("");
  const [refLoadingMore, setRefLoadingMore] = useState(false);
  const [refHasMore, setRefHasMore] = useState(true);
  const [refSearching, setRefSearching] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [reportPdfBase64, setReportPdfBase64] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportLoadFailed, setReportLoadFailed] = useState(false);
  const [isReportRendering, setIsReportRendering] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareOptionsVisible, setShareOptionsVisible] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [reportLoadingMessage, setReportLoadingMessage] = useState("");
  const [webViewRenderKey, setWebViewRenderKey] = useState(0);
  const webViewRef = useRef<WebView>(null);
  const reportHtmlRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const { isMounted, showAlertIfActive } = useSafeAlert();
  const PAGE_SIZE = 20;
  const reportWebViewSource = useMemo(
    () => ({ html: reportHtml ?? "" }),
    [reportHtml]
  );

  reportHtmlRef.current = reportHtml;

  useEnumAndReferenceLoader(
    parameterFields,
    setEnumData,
    setReferenceData,
    referenceData
  );

  useEffect(() => {
    if (!loading) {
      setReportLoadingMessage("");
      return;
    }

    setReportLoadingMessage("Đang tạo báo cáo...");
    const timer = setTimeout(() => {
      setReportLoadingMessage(
        "Báo cáo đang xử lý, vui lòng chờ thêm vài giây..."
      );
    }, REPORT_SLOW_LOADING_MS);

    return () => clearTimeout(timer);
  }, [loading]);

  const handleParameterChange = useCallback(
    (name: string, value: any) => {
      handleCascadeChange({
        name,
        value,
        fieldActive: parameterFields,
        setFormData: setParameterValues,
        setReferenceData,
        setRefPage,
        setRefHasMore,
      });
    },
    [parameterFields]
  );

  const loadReferenceModalData = useCallback(
    async (
      field: Field,
      {
        textSearch = "",
        page = 0,
        append = false,
      }: { textSearch?: string; page?: number; append?: boolean } = {}
    ) => {
      setReferenceErrorMessage(null);

      const result = await loadReferenceItemsForField({
        field,
        formData: parameterValues,
        setReferenceData,
        params: buildReferenceFetchParams({
          textSearch,
          pageSize: PAGE_SIZE,
          page,
          append,
          currentIds: field.isMulti
            ? String(parameterValues[field.name] ?? "")
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean)
            : getCurrentReferenceIds(parameterValues, field.name),
        }),
        requireAllParents: false,
      });

      if (result && typeof result === "object" && "errorMessage" in result) {
        setReferenceData((prev: any) => ({
          ...prev,
          [field.name]: {
            items: [],
            totalCount: 0,
          },
        }));
        setReferenceErrorMessage(
          String(result.errorMessage || "Không thể tải dữ liệu.")
        );
        return "error";
      }

      return result !== false;
    },
    [parameterValues]
  );

  const openReferenceModal = useCallback(
    async (field: Field) => {
      if (
        field.typeProperty === TypeProperty.Reference &&
        field.referenceName
      ) {
        await loadReferenceModalData(field);
      }

      setActiveEnumField(field);
      setRefKeyword("");
      setRefPage(0);
      setRefHasMore(true);
      setModalVisible(true);
    },
    [loadReferenceModalData]
  );

  const modalItems = useModalItems(
    activeEnumField,
    referenceData,
    enumData,
    parameterValues
  );

  const getRequiredLabel = (parameter: ReportConfigParameter) =>
    parameter.moTa || parameter.name;

  const buildReportPayload = useCallback(
    (isPreview = true) => {
      const payload: Record<string, any> = { isPreview };

      for (const parameter of activeParameters) {
        const value = parameterValues[parameter.name];
        const payloadKey = normalizeReportPayloadKey(parameter.name);

        const isEmptyValue =
          value === "" ||
          value === null ||
          value === undefined ||
          (Array.isArray(value) && value.length === 0);

        if (parameter.isRequired && isEmptyValue) {
          throw new Error(`REQUIRED:${getRequiredLabel(parameter)}`);
        }

        if (parameter.isMulti && isEmptyValue) {
          payload[payloadKey] = [];
          continue;
        }

        switch (parameter.typeProperty) {
          case TypeProperty.Date: {
            if (!value) {
              payload[payloadKey] = null;
              break;
            }

            if (!parseReportDate(String(value))) {
              throw new Error(`INVALID_DATE:${getRequiredLabel(parameter)}`);
            }

            payload[payloadKey] = formatDateForBE(value);
            break;
          }

          case TypeProperty.Int:
          case TypeProperty.Decimal:
            payload[payloadKey] =
              value === "" || value === null || value === undefined
                ? null
                : Number(value);
            break;

          case TypeProperty.Bool:
            payload[payloadKey] = Boolean(value);
            break;

          case TypeProperty.String:
          case TypeProperty.Text:
          case TypeProperty.Enum:
          case TypeProperty.Reference:
          case TypeProperty.Time:
          case TypeProperty.Link:
            payload[payloadKey] =
              value === "" || value === null || value === undefined
                ? null
                : normalizeReportPayloadValue(parameter, value);
            break;

          default:
            payload[payloadKey] =
              value === "" || value === null || value === undefined
                ? null
                : normalizeReportPayloadValue(parameter, value);
        }
      }

      const fromValue =
        parameterValues.TuNgay ??
        parameterValues.tuNgay ??
        payload.tuNgay ??
        payload.TuNgay ??
        null;
      const toValue =
        parameterValues.DenNgay ??
        parameterValues.denNgay ??
        payload.denNgay ??
        payload.DenNgay ??
        null;
      const fromDate =
        typeof fromValue === "string" ? parseReportDate(fromValue) : null;
      const toDate =
        typeof toValue === "string" ? parseReportDate(toValue) : null;
      if (fromDate && toDate && fromDate > toDate) {
        throw new Error("INVALID_DATE_RANGE");
      }

      return payload;
    },
    [activeParameters, parameterValues]
  );

  const loadReport = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent;
      let requestPayload: Record<string, any> | undefined;

      try {
        requestPayload = buildReportPayload(true);

        setLoading(true);

        const res = await getPreviewBC(
          requestPayload,
          previewEndpoint,
          REPORT_PREVIEW_TIMEOUT_MS
        );

        if (!res?.data) {
          throw new Error("Report response is empty");
        }

        setReportError(null);
        setReportLoadFailed(false);
        setIsReportRendering(true);
        setReportPdfBase64(res.data);
        setReportHtml(buildReportHtml(res.data, isDark));
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message.startsWith("REQUIRED:")) {
          const label = message.replace("REQUIRED:", "");
          if (!silent) showAlertIfActive("Lỗi", `Vui lòng nhập ${label}.`);
          return;
        }
        if (message.startsWith("INVALID_DATE:")) {
          const label = message.replace("INVALID_DATE:", "");
          if (!silent) showAlertIfActive("Lỗi", `${label} không hợp lệ.`);
          return;
        }
        if (message === "INVALID_DATE_RANGE") {
          if (!silent) {
            showAlertIfActive("Lỗi", "Từ ngày không được lớn hơn Đến ngày.");
          }
          return;
        }

        const reportErrorMessage =
          "Không thể tải báo cáo. Vui lòng thử lại sau.";

        // A reconnect refresh must never replace a report that the user can
        // still read. Keep the current WebView/PDF and retry on the next
        // connection event; only expose the error when there is no preview.
        if (!silent || !reportHtmlRef.current) {
          setReportError(reportErrorMessage);
          setReportLoadFailed(true);
        }
        if (!silent) {
          showAlertIfActive("Lỗi", reportErrorMessage);
        }
      } finally {
        if (isMounted()) {
          setLoading(false);
        }
      }
    },
    [buildReportPayload, isDark, isMounted, previewEndpoint, showAlertIfActive]
  );

  useEffect(() => {
    if (!reportPdfBase64) return;
    setReportHtml(buildReportHtml(reportPdfBase64, isDark));
    setWebViewRenderKey((currentKey) => currentKey + 1);
  }, [isDark, reportPdfBase64]);

  const handleSubmit = useCallback(() => {
    loadReport();
  }, [loadReport]);

  useNetworkAwareReload(() => loadReport({ silent: true }), {
    enabled: Boolean(reportHtml) || reportLoadFailed,
    hasError: reportLoadFailed,
    refetchOnAppResume: false,
    // Supplying an offline handler lets the hook remember the offline state.
    // We deliberately leave the rendered report untouched while disconnected.
    onOffline: () => {},
  });

  const closeReportPreview = useCallback(() => {
    Orientation.lockToPortrait();
    setIsLandscape(false);
    setReportHtml(null);
    setReportPdfBase64(null);
    setReportError(null);
    setReportLoadFailed(false);
    setIsReportRendering(false);
    setShareOptionsVisible(false);
  }, []);

  const closeReportModal = useCallback(() => {
    Orientation.lockToPortrait();
    onClose();
  }, [onClose]);

  const toggleReportOrientation = useCallback(() => {
    if (isLandscape) {
      setIsLandscape(false);
      Orientation.lockToPortrait();
      return;
    }

    setIsLandscape(true);
    Orientation.lockToLandscapeLeft();
  }, [isLandscape]);

  const postToReport = useCallback((message: string) => {
    webViewRef.current?.postMessage(message);
  }, []);

  const remountReportWebView = useCallback(() => {
    if (!reportHtml) return;

    setReportError(null);
    setIsReportRendering(true);
    setWebViewRenderKey((current) => current + 1);
  }, [reportHtml]);

  const shareReportFile = useCallback(
    async (option: ShareReportOption) => {
      const fileInfo =
        option === "pdf"
          ? getReportFileInfo("pdf")
          : getReportFileInfo(reportConfig.report.fileType);

      let base64Data = reportPdfBase64;

      if (option === "original" || !base64Data) {
        const payload = buildReportPayload(option === "pdf");

        log("[ReportView] Calling report share file", {
          reportName: reportConfig.report.name,
          endpoint: previewEndpoint,
          option,
          payload,
        });

        const res = await getPreviewBC(payload, previewEndpoint);
        if (!res.data) {
          throw new Error("Report share response is empty");
        }

        base64Data = res.data;
      }

      if (!base64Data) {
        throw new Error("Report share data is empty");
      }

      const fileName = `${sanitizeShareFileName(
        title
      )}_${formatShareTimestamp()}.${fileInfo.extension}`;
      const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

      await RNFS.writeFile(filePath, base64Data, "base64");
      await Share.open({
        url: `file://${filePath}`,
        type: fileInfo.mimeType,
        failOnCancel: false,
      });
    },
    [
      buildReportPayload,
      previewEndpoint,
      reportConfig.report.fileType,
      reportConfig.report.name,
      reportPdfBase64,
      title,
    ]
  );

  const handleShareReport = useCallback(
    async (option: ShareReportOption) => {
      if (isSharing) return;

      try {
        setIsSharing(true);
        setShareOptionsVisible(false);
        await shareReportFile(option);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message.startsWith("REQUIRED:")) {
          const label = message.replace("REQUIRED:", "");
          showAlertIfActive("Lỗi", `Vui lòng nhập ${label}.`);
          return;
        }
        if (message.startsWith("INVALID_DATE:")) {
          const label = message.replace("INVALID_DATE:", "");
          showAlertIfActive("Lỗi", `${label} không hợp lệ.`);
          return;
        }
        if (message === "INVALID_DATE_RANGE") {
          showAlertIfActive("Lỗi", "Từ ngày không được lớn hơn Đến ngày.");
          return;
        }

        error("Share report error:", err);
        showAlertIfActive("Lỗi", "Không thể mở chia sẻ báo cáo.");
      } finally {
        if (isMounted()) {
          setIsSharing(false);
        }
      }
    },
    [isMounted, isSharing, shareReportFile, showAlertIfActive]
  );

  const handleWebViewMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === "ready") {
        setReportError(null);
        setIsReportRendering(false);
      }
      if (message.type === "error") {
        setIsReportRendering(false);
        setReportError(message.payload || "Không thể hiển thị báo cáo.");
      }
    } catch {
      // Ignore non-JSON messages from the WebView.
    }
  };

  useEffect(() => {
    const handler = (orientation: string) => {
      setIsLandscape(
        orientation === "LANDSCAPE-LEFT" || orientation === "LANDSCAPE-RIGHT"
      );
    };

    Orientation.addOrientationListener(handler);
    return () => {
      Orientation.removeOrientationListener(handler);
      Orientation.lockToPortrait();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        reportHtml &&
        nextState === "active" &&
        previousState.match(/inactive|background/)
      ) {
        remountReportWebView();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [remountReportWebView, reportHtml]);

  if (reportHtml) {
    return (
      <View style={styles.container}>
        {!isLandscape ? (
          <HeaderDetailsModalHeader
            title={title}
            onBack={closeReportPreview}
            badgeLabel="Bao cao"
            iconName="bar-chart-outline"
            rightSlot={
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => setShareOptionsVisible(true)}
                disabled={isSharing}
              >
                {isSharing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons
                    name="share-social-outline"
                    size={24}
                    color="#fff"
                  />
                )}
              </TouchableOpacity>
            }
          />
        ) : null}

        {!isLandscape ? (
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={[
                styles.toolbarButton,
                { borderColor: hairlineBorderColor },
              ]}
              onPress={() => postToReport("zoom_out")}
            >
              <Ionicons name="remove-outline" size={18} color={C.red} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toolbarButton,
                { borderColor: hairlineBorderColor },
              ]}
              onPress={() => postToReport("zoom_in")}
            >
              <Ionicons name="add-outline" size={18} color={C.red} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toolbarButton,
                { borderColor: hairlineBorderColor },
              ]}
              onPress={() => postToReport("top")}
            >
              <Ionicons name="arrow-up-outline" size={18} color={C.red} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toolbarButton,
                { borderColor: hairlineBorderColor },
              ]}
              onPress={toggleReportOrientation}
            >
              <MaterialCommunityIcons
                name="phone-rotate-landscape"
                size={18}
                color={C.red}
              />
            </TouchableOpacity>
          </View>
        ) : null}

        <View
          style={[
            styles.reportContainer,
            isLandscape && styles.reportContainerLandscape,
          ]}
        >
          <WebView
            key={webViewRenderKey}
            ref={webViewRef}
            originWhitelist={["*"]}
            source={reportWebViewSource}
            style={styles.reportWebView}
            javaScriptEnabled
            domStorageEnabled
            nestedScrollEnabled
            scalesPageToFit
            onMessage={handleWebViewMessage}
            onError={() => {
              setIsReportRendering(false);
              setReportError("Không thể hiển thị báo cáo.");
            }}
            onContentProcessDidTerminate={remountReportWebView}
            onRenderProcessGone={remountReportWebView}
          />

          {isReportRendering && !reportError ? (
            <View style={styles.renderOverlay}>
              <ActivityIndicator color={C.red} />
              <Text style={styles.renderOverlayText}>
                Đang hiển thị báo cáo...
              </Text>
            </View>
          ) : null}

          {reportError ? (
            <View style={styles.renderOverlay}>
              <Ionicons name="alert-circle-outline" size={28} color={C.red} />
              <Text style={styles.renderOverlayText}>{reportError}</Text>
            </View>
          ) : null}

          {isLandscape ? (
            <View style={styles.landscapeControls}>
              <TouchableOpacity
                style={styles.landscapeButton}
                onPress={closeReportPreview}
              >
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.landscapeButton}
                onPress={toggleReportOrientation}
              >
                <MaterialCommunityIcons
                  name={
                    isLandscape
                      ? "phone-rotate-portrait"
                      : "phone-rotate-landscape"
                  }
                  size={21}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <BottomSheetModalShell
          visible={shareOptionsVisible}
          onClose={() => setShareOptionsVisible(false)}
          closeOnBackdropPress
          showCloseButton
          showHandle
          statusBarTranslucent
          presentationStyle="overFullScreen"
          sheetStyle={styles.shareSheet}
        >
          <Text style={styles.shareSheetTitle} allowFontScaling={false}>
            Chọn loại file chia sẻ
          </Text>

          <View style={styles.shareOptionList}>
            {SHARE_REPORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.shareOptionItem,
                  { borderColor: hairlineBorderColor },
                ]}
                activeOpacity={0.75}
                disabled={isSharing}
                onPress={() => handleShareReport(option.key)}
              >
                <View style={styles.shareOptionIcon}>
                  <Ionicons name={option.icon} size={20} color={C.red} />
                </View>
                <Text style={styles.shareOptionText} allowFontScaling={false}>
                  {option.label}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={C.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>
        </BottomSheetModalShell>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderDetailsModalHeader
        title={title}
        onBack={closeReportModal}
        badgeLabel="Dieu kien loc"
        iconName="options-outline"
      />

      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        {parameterFields.map((parameter) => (
          <View key={parameter.id} style={styles.parameterField}>
            <Text style={styles.parameterLabel}>
              {parameter.moTa || parameter.name}
              {parameter.isRequired ? (
                <Text style={styles.required}> *</Text>
              ) : null}
            </Text>

            <RenderInputByType
              f={parameter}
              formData={parameterValues}
              enumData={enumData}
              referenceData={referenceData}
              handleChange={handleParameterChange}
              pickImage={async () => undefined}
              setLoadingImages={() => undefined}
              getDefaultValueForField={getInitialParameterValue as any}
              disableNumberGrouping={Boolean(parameter.notShowSplit)}
              mode="add"
              openEnumReferanceModal={openReferenceModal}
              styles={{
                ...styles,
                uploadButton: [
                  styles.uploadButton,
                  { borderColor: strongBorderColor },
                ],
              }}
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonLoading]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText} allowFontScaling={false}>
              Thực hiện
            </Text>
          )}
        </TouchableOpacity>

        {loading && reportLoadingMessage ? (
          <Text style={styles.reportLoadingText} allowFontScaling={false}>
            {reportLoadingMessage}
          </Text>
        ) : null}
      </ScrollView>

      <AssetFormReferencePickerModal
        activeEnumField={activeEnumField}
        formData={parameterValues}
        handleChange={handleParameterChange}
        loadReferenceModalData={loadReferenceModalData}
        modalItems={modalItems}
        modalVisible={modalVisible}
        referenceErrorMessage={referenceErrorMessage}
        refHasMore={refHasMore}
        refKeyword={refKeyword}
        refLoadingMore={refLoadingMore}
        refPage={refPage}
        refSearching={refSearching}
        isMulti={Boolean(activeEnumField?.isMulti)}
        referenceData={referenceData}
        setFormData={setParameterValues}
        setModalVisible={setModalVisible}
        setReferenceErrorMessage={setReferenceErrorMessage}
        setRefHasMore={setRefHasMore}
        setRefKeyword={setRefKeyword}
        setRefLoadingMore={setRefLoadingMore}
        setRefPage={setRefPage}
        setRefSearching={setRefSearching}
      />
    </View>
  );
};

export default ReportView;
