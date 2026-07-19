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
  StyleSheet,
  useColorScheme,
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
  ReportConfigData,
  ReportConfigParameter,
  ReportViewProps,
} from "../../types";
import { getPreviewBC } from "../../services/data/callApi";
import { error, log } from "../../utils/Logger";
import { formatDateForBE } from "../../utils/Date";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { C } from "../../utils/helpers/colors";
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

const parseReportDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;

  const [d, m, y] = dateStr.replace(/-/g, "/").split("/").map(Number);
  if (!d || !m || !y) return null;

  const now = new Date();
  return new Date(
    y,
    m - 1,
    d,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );
};

const getReportFileInfo = (fileType?: string | null) => {
  const normalizedType = String(fileType ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\./, "");

  if (["xlsx", "excel", "xls"].includes(normalizedType)) {
    return {
      extension: normalizedType === "xls" ? "xls" : "xlsx",
      mimeType:
        normalizedType === "xls"
          ? "application/vnd.ms-excel"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  if (["docx", "word", "doc"].includes(normalizedType)) {
    return {
      extension: normalizedType === "doc" ? "doc" : "docx",
      mimeType:
        normalizedType === "doc"
          ? "application/msword"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  return {
    extension: "pdf",
    mimeType: "application/pdf",
  };
};

const sanitizeShareFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 90) || "bao-cao";

const formatShareTimestamp = (value = new Date()) => {
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = value.getFullYear();
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const seconds = String(value.getSeconds()).padStart(2, "0");

  return `${day}-${month}-${year}_${hours}-${minutes}-${seconds}`;
};

type ShareReportOption = "original" | "pdf";

const SHARE_REPORT_OPTIONS: Array<{
  icon: string;
  key: ShareReportOption;
  label: string;
}> = [
  { key: "original", label: "Share file gốc", icon: "document-attach-outline" },
  { key: "pdf", label: "Share file PDF", icon: "document-outline" },
];

const shouldRetryReportPreview = (err: unknown) => {
  const apiError = err as any;
  const status = apiError?.response?.status;
  const isTimeout =
    apiError?.code === "ECONNABORTED" ||
    String(apiError?.message ?? "")
      .toLowerCase()
      .includes("timeout");

  if (status === 401 || status === 403) return false;
  if (isTimeout) return true;
  if (typeof status === "number") return status >= 500;
  return Boolean(apiError?.code);
};

const REPORT_PREVIEW_RETRY_DELAY_MS = 800;
const REPORT_PREVIEW_MAX_ATTEMPTS = 2;
const REPORT_PREVIEW_ATTEMPT_TIMEOUT_MS = 15000;
const REPORT_SLOW_LOADING_MS = 8000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const buildReportHtml = (pdfBase64: string, isDark = false) => `
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=0.5, maximum-scale=4.0, user-scalable=yes">
    <script>
      const PDF_JS_SOURCES = [
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.min.js",
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@2.14.305/build/pdf.min.js"
      ];
      let currentSourceIndex = 0;
      function loadPdfJs() {
        const script = document.createElement("script");
        script.src = PDF_JS_SOURCES[currentSourceIndex];
        script.onload = renderPdf;
        script.onerror = function() {
          currentSourceIndex += 1;
          if (currentSourceIndex < PDF_JS_SOURCES.length) {
            loadPdfJs();
          } else {
            showError("Không thể tải trình hiển thị PDF. Vui lòng kiểm tra kết nối mạng.");
          }
        };
        document.head.appendChild(script);
      }
    </script>
    <style>
      * { box-sizing: border-box; }
      body { margin:0; padding:0; overflow-x:hidden; overflow-y:auto; background:${
        isDark ? "#09111B" : "#F5F5F5"
      }; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
      #status { position:sticky; top:0; z-index:2; display:flex; align-items:center; justify-content:center; gap:8px; min-height:44px; padding:10px 14px; background:${
        isDark ? "#151F2C" : "#FFFFFF"
      }; color:${isDark ? "#AAB7C8" : "#4B5563"}; font-size:13px; box-shadow:0 1px 4px rgba(15,25,35,0.18); }
      #status.hidden { display:none; }
      #status.error { color:${isDark ? "#FF9AA0" : "#B42318"}; background:${
        isDark ? "#3A2028" : "#FFF5F5"
      }; }
      #spinner { width:16px; height:16px; border-radius:50%; border:2px solid ${
        isDark ? "#3B4D63" : "#E5E7EB"
      }; border-top-color:#C8102E; animation:spin 0.8s linear infinite; }
      #container { display:flex; flex-direction:column; align-items:center; width:100%; padding:10px; }
      canvas { display:block; width:100%; max-width:none !important; height:auto !important; margin-bottom:12px; border:1px solid #D9DEE8; box-shadow:0 2px 6px rgba(0,0,0,0.1); background:#fff; transform-origin:top center; }
      @keyframes spin { to { transform:rotate(360deg); } }
    </style>
  </head>
  <body>
    <div id="status"><span id="spinner"></span><span id="statusText">Đang hiển thị báo cáo...</span></div>
    <div id="container"></div>
    <script>
      const pdfData = ${JSON.stringify(pdfBase64)};
      let zoom = 1;

      function postMessage(type, payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
        }
      }

      function setStatus(text) {
        document.getElementById("status").className = "";
        document.getElementById("statusText").textContent = text;
      }

      function hideStatus() {
        document.getElementById("status").className = "hidden";
      }

      function showError(message) {
        const status = document.getElementById("status");
        status.className = "error";
        status.innerHTML = "<span>" + message + "</span>";
        postMessage("error", message);
      }

      function applyZoom() {
        document.querySelectorAll("canvas").forEach(function(canvas) {
          canvas.style.width = (zoom * 100) + "%";
        });
      }

      async function renderPdf() {
        try {
          if (!pdfData) {
            showError("Không có dữ liệu báo cáo để hiển thị.");
            return;
          }

          const pdfjsLib = window["pdfjs-dist/build/pdf"];
          pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_SOURCES[currentSourceIndex].replace("pdf.min.js", "pdf.worker.min.js");
          const pdf = await pdfjsLib.getDocument({ data: atob(pdfData) }).promise;
          const container = document.getElementById("container");

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            setStatus("Đang hiển thị trang " + pageNum + "/" + pdf.numPages + "...");
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.5 });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            container.appendChild(canvas);
            await page.render({ canvasContext: context, viewport }).promise;
            applyZoom();
          }

          hideStatus();
          postMessage("ready", { pages: pdf.numPages });
        } catch (err) {
          showError("Không thể hiển thị báo cáo. Vui lòng thử lại.");
        }
      }

      function handleMessage(raw) {
        const message = typeof raw === "string" ? raw : raw && raw.data;
        if (message === "zoom_in") {
          zoom = Math.min(zoom + 0.15, 2);
          applyZoom();
        }
        if (message === "zoom_out") {
          zoom = Math.max(zoom - 0.15, 0.7);
          applyZoom();
        }
        if (message === "top") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }

      window.addEventListener("message", function(event) { handleMessage(event.data); });
      document.addEventListener("message", function(event) { handleMessage(event.data); });
      loadPdfJs();
    </script>
  </body>
</html>
`;

const getInitialParameterValue = (parameter: ReportConfigParameter) => {
  if (!parameter.name) return "";

  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const defaultValue = parameter.defaultValue?.trim();
  const formatDateValue = (value: Date) => {
    const nextDay = String(value.getDate()).padStart(2, "0");
    const nextMonth = String(value.getMonth() + 1).padStart(2, "0");
    const nextYear = value.getFullYear();
    return `${nextDay}-${nextMonth}-${nextYear}`;
  };

  switch (parameter.typeProperty) {
    case TypeProperty.Date:
      if (parameter.defaultDateNow === true) return `${day}-${month}-${year}`;
      if (defaultValue === "FIRST_DAY_MONTH") {
        return formatDateValue(new Date(now.getFullYear(), now.getMonth(), 1));
      }
      return "";

    case TypeProperty.Int: {
      if (parameter.defaultYearNow === true) return year;
      if (parameter.defaultMonthNow === true) return now.getMonth() + 1;
      if (defaultValue && /^-?\d+$/.test(defaultValue)) {
        return Number(defaultValue);
      }
      return "";
    }

    case TypeProperty.Decimal: {
      if (defaultValue && !Number.isNaN(Number(defaultValue))) {
        return Number(defaultValue);
      }
      return "";
    }

    case TypeProperty.Bool:
      if (defaultValue?.toLowerCase() === "true") return true;
      if (defaultValue?.toLowerCase() === "false") return false;
      return "";

    case TypeProperty.Enum:
    case TypeProperty.Reference:
      if (parameter.defaultMonthNow === true) return now.getMonth() + 1;
      if (parameter.defaultYearNow === true) return year;
      if (defaultValue && /^-?\d+$/.test(defaultValue)) {
        return Number(defaultValue);
      }
      return "";

    default:
      return defaultValue || "";
  }
};

const buildInitialParameterValues = (parameters: ReportConfigParameter[]) =>
  parameters.reduce<Record<string, any>>((acc, parameter) => {
    acc[parameter.name] = getInitialParameterValue(parameter);
    return acc;
  }, {});

const normalizeReportPayloadKey = (name: string) =>
  name ? `${name.charAt(0).toLowerCase()}${name.slice(1)}` : name;

const normalizeReportPayloadValue = (
  parameter: ReportConfigParameter,
  value: any
) => {
  if (parameter.isMulti) {
    if (Array.isArray(value)) return value;

    return String(value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const numericValue = Number(item);
        return Number.isNaN(numericValue) ? item : numericValue;
      });
  }

  return value;
};

const mapReportParameterToField = (
  parameter: ReportConfigParameter
): Field => ({
  id: parameter.id,
  iD_Class: parameter.iD_Report,
  iD_Class_Name: parameter.iD_Report_MoTa,
  name: parameter.name,
  moTa: parameter.moTa,
  isShowGrid: true,
  isUnique: false,
  isRequired: parameter.isRequired,
  isActive: parameter.isActive,
  typeProperty: parameter.typeProperty,
  typeProperty_MoTa: Number(
    parameter.typeProperty_MoTa ?? parameter.typeProperty
  ),
  maxLength: 0,
  maxValue: parameter.maxValue ?? 0,
  minValue: parameter.minValue ?? 0,
  referenceName: parameter.referenceName ?? "",
  referenceNameMulti: parameter.referenceNameMulti ?? "",
  referenceProperty: "",
  isMulti: Boolean(parameter.isMulti),
  stt: parameter.stt,
  columnSize: parameter.columnSize,
  columnNone: 0,
  cascadeClearFields: parameter.cascadeClearFields ?? "",
  parentsFields: parameter.parentsFields ?? "",
  groupLayout: "",
  isShowDetail: true,
  enumName: parameter.enumName ?? "",
  prefix: parameter.prefix ?? "",
  defaultValue: parameter.defaultValue ?? "",
  defaultDateNow: Boolean(parameter.defaultDateNow),
  width: "",
  isReadOnly: false,
  stT_Grid: parameter.stt,
  notShowReference: false,
  notShowSplit: Boolean(parameter.notShowSplit),
  isShowMobile: true,
  defaultTimeNow: false,
  tooltip: "",
});

const createDefaultReportConfig = (title: string): ReportConfigData => ({
  report: {
    id: 0,
    idRootReport_MoTa: null,
    name: title,
    moTa: title,
    idRootReport: 0,
    isRootReport: false,
    isActive: true,
    lstPermission: null,
    direct: "",
    fileType: null,
  },
  parameters: [
    {
      id: 1,
      iD_Report_MoTa: title,
      typeProperty_MoTa: TypeProperty.Date,
      iD_Report: 0,
      name: "tuNgay",
      moTa: "Từ ngày",
      typeProperty: TypeProperty.Date,
      enumName: null,
      referenceName: null,
      referenceNameMulti: null,
      isMulti: null,
      parentsFields: null,
      cascadeClearFields: null,
      defaultValue: null,
      defaultDateNow: null,
      defaultYearNow: null,
      defaultMonthNow: null,
      isRequired: false,
      minValue: null,
      maxValue: null,
      columnSize: 12,
      notShowSplit: null,
      showTime: null,
      prefix: null,
      isActive: true,
      stt: 1,
    },
    {
      id: 2,
      iD_Report_MoTa: title,
      typeProperty_MoTa: TypeProperty.Date,
      iD_Report: 0,
      name: "denNgay",
      moTa: "Đến ngày",
      typeProperty: TypeProperty.Date,
      enumName: null,
      referenceName: null,
      referenceNameMulti: null,
      isMulti: null,
      parentsFields: null,
      cascadeClearFields: null,
      defaultValue: null,
      defaultDateNow: null,
      defaultYearNow: null,
      defaultMonthNow: null,
      isRequired: false,
      minValue: null,
      maxValue: null,
      columnSize: 12,
      notShowSplit: null,
      showTime: null,
      prefix: null,
      isActive: true,
      stt: 2,
    },
  ],
});

const ReportView: React.FC<ReportViewProps> = ({
  title,
  config,
  previewEndpoint,
  onClose,
}) => {
  const isDark = useColorScheme() === "dark";
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
    Record<string, { items: any[]; totalCount: number }>
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

        let res: Awaited<ReturnType<typeof getPreviewBC>> | null = null;
        for (
          let attempt = 1;
          attempt <= REPORT_PREVIEW_MAX_ATTEMPTS;
          attempt++
        ) {
          try {
            res = await getPreviewBC(
              requestPayload,
              previewEndpoint,
              REPORT_PREVIEW_ATTEMPT_TIMEOUT_MS
            );
            break;
          } catch (previewErr) {
            const canRetry =
              attempt < REPORT_PREVIEW_MAX_ATTEMPTS &&
              shouldRetryReportPreview(previewErr);

            if (!canRetry) {
              throw previewErr;
            }

            setReportLoadingMessage("Kết nối chưa ổn định, đang thử lại...");
            await sleep(REPORT_PREVIEW_RETRY_DELAY_MS);
          }
        }

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
            backIcon="chevron-back"
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
              style={styles.toolbarButton}
              onPress={() => postToReport("zoom_out")}
            >
              <Ionicons name="remove-outline" size={18} color={C.red} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => postToReport("zoom_in")}
            >
              <Ionicons name="add-outline" size={18} color={C.red} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => postToReport("top")}
            >
              <Ionicons name="arrow-up-outline" size={18} color={C.red} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolbarButton}
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
                style={styles.shareOptionItem}
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
                <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
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
        badgeLabel="Dieu kien loc"
        iconName="options-outline"
        rightSlot={
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={closeReportModal}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
        }
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
              styles={styles}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.surface,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  form: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  formScroll: {
    flex: 1,
  },
  parameterField: {
    gap: 7,
  },
  parameterLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
  },
  required: {
    color: C.red,
  },
  parameterInput: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderStrong,
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    fontSize: 14,
    color: C.text,
  },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderStrong,
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    fontSize: 14,
    color: C.text,
  },
  textArea: {
    minHeight: 92,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderStrong,
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
  },
  boolRow: {
    minHeight: 36,
    paddingHorizontal: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  boolLabel: {
    flex: 1,
    paddingRight: 12,
  },
  tooltipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tooltipLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textSecondary,
  },
  tooltipText: {
    flex: 1,
    fontSize: 12,
    color: C.textMuted,
  },
  uploadButton: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderStrong,
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    backgroundColor: C.surfaceAlt,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButton: {
    backgroundColor: C.red,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center" as const,
  },
  submitButtonLoading: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold" as const,
  },
  reportLoadingText: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    paddingHorizontal: 12,
    textAlign: "center",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: C.surface,
  },
  toolbarButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  reportContainer: {
    flex: 1,
    backgroundColor: C.bg,
  },
  reportContainerLandscape: {
    backgroundColor: "#000",
  },
  reportWebView: {
    flex: 1,
  },
  landscapeControls: {
    position: "absolute",
    top: 18,
    right: 18,
    flexDirection: "row",
    gap: 10,
    padding: 4,
  },
  landscapeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  shareSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingBottom: 22,
  },
  shareSheetTitle: {
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: C.text,
    marginBottom: 12,
  },
  shareOptionList: {
    gap: 8,
  },
  shareOptionItem: {
    minHeight: 54,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  shareOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.redSurface,
    marginRight: 10,
  },
  shareOptionText: {
    flex: 1,
    color: C.text,
    fontSize: 14.5,
    fontWeight: "700",
  },
  renderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.loadingOverlay,
    gap: 10,
  },
  renderOverlayText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: "600",
    lineHeight: 19,
    paddingHorizontal: 24,
    textAlign: "center",
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  fsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#000",
  },
  fsHeaderLandscape: {
    paddingTop: 48,
  },
  fsHeaderBtn: {
    padding: 6,
  },
  fsTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginHorizontal: 4,
  },
  fullscreenReportArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
});
