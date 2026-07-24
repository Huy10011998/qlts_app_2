import type {
  Field,
  ReportConfigData,
  ReportConfigParameter,
} from "../../types";
import { TypeProperty } from "../../utils/Enum";

export const parseReportDate = (dateStr: string): Date | null => {
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

export const getReportFileInfo = (fileType?: string | null) => {
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

export const sanitizeShareFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 90) || "bao-cao";

export const formatShareTimestamp = (value = new Date()) => {
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = value.getFullYear();
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const seconds = String(value.getSeconds()).padStart(2, "0");

  return `${day}-${month}-${year}_${hours}-${minutes}-${seconds}`;
};

export type ShareReportOption = "original" | "pdf";

export const SHARE_REPORT_OPTIONS: Array<{
  icon: string;
  key: ShareReportOption;
  label: string;
}> = [
  { key: "original", label: "Share file gốc", icon: "document-attach-outline" },
  { key: "pdf", label: "Share file PDF", icon: "document-outline" },
];

export const REPORT_PREVIEW_TIMEOUT_MS = 60000;
export const REPORT_SLOW_LOADING_MS = 8000;

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
      }; color:${
  isDark ? "#AAB7C8" : "#4B5563"
}; font-size:13px; box-shadow:0 1px 4px rgba(15,25,35,0.18); }
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

export const getInitialParameterValue = (parameter: ReportConfigParameter) => {
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

export const buildInitialParameterValues = (parameters: ReportConfigParameter[]) =>
  parameters.reduce<Record<string, any>>((acc, parameter) => {
    acc[parameter.name] = getInitialParameterValue(parameter);
    return acc;
  }, {});

export const normalizeReportPayloadKey = (name: string) =>
  name ? `${name.charAt(0).toLowerCase()}${name.slice(1)}` : name;

export const normalizeReportPayloadValue = (
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

export const mapReportParameterToField = (
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

export const createDefaultReportConfig = (title: string): ReportConfigData => ({
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
