import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { WebView } from "react-native-webview";
import { ReportViewProps } from "../../types";
import { getPreviewBC } from "../../services/data/callApi";
import { error } from "../../utils/Logger";
import { formatToSlash } from "../../utils/Date";
import { DatePicker } from "../dataPicker/DataPicker";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { C } from "../../utils/helpers/colors";
import EmptyState from "../ui/EmptyState";

const parseReportDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;

  const [d, m, y] = dateStr.split("/").map(Number);
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

const buildReportHtml = (pdfBase64: string) => `
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
      body { margin:0; padding:0; overflow-x:hidden; overflow-y:auto; background:#f5f5f5; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
      #status { position:sticky; top:0; z-index:2; display:flex; align-items:center; justify-content:center; gap:8px; min-height:44px; padding:10px 14px; background:#fff; color:#4B5563; font-size:13px; box-shadow:0 1px 4px rgba(15,25,35,0.08); }
      #status.hidden { display:none; }
      #status.error { color:#B42318; background:#FFF5F5; }
      #spinner { width:16px; height:16px; border-radius:50%; border:2px solid #E5E7EB; border-top-color:#C8102E; animation:spin 0.8s linear infinite; }
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

const ReportView: React.FC<ReportViewProps> = ({
  title,
  previewEndpoint,
  onClose,
}) => {
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [webViewRendering, setWebViewRendering] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const { isMounted, showAlertIfActive } = useSafeAlert();

  const handleSubmit = async () => {
    const from = parseReportDate(fromDate);
    const to = toDate ? parseReportDate(toDate) : from ? new Date() : null;

    if ((fromDate && !from) || (toDate && !to)) {
      showAlertIfActive("Lỗi", "Ngày nhập không hợp lệ.");
      return;
    }

    if (from && to && from > to) {
      showAlertIfActive("Lỗi", "Từ ngày không được lớn hơn Đến ngày.");
      return;
    }

    try {
      setLoading(true);
      setReportError(null);
      setReportHtml(null);
      const res = await getPreviewBC(
        {
          tuNgay: from?.toISOString(),
          denNgay: to?.toISOString(),
          isPreview: true,
        },
        previewEndpoint
      );

      if (!res.data) {
        throw new Error("Report response is empty");
      }

      setWebViewRendering(true);
      setReportHtml(buildReportHtml(res.data));
    } catch (err) {
      error("Lỗi khi gọi API:", err);
      setReportError("Không thể tải báo cáo.");
      showAlertIfActive("Lỗi", "Không thể tải báo cáo.");
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  };

  const postToReport = (message: string) => {
    webViewRef.current?.postMessage(message);
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === "ready") {
        setWebViewRendering(false);
        setReportError(null);
      }
      if (message.type === "error") {
        setWebViewRendering(false);
        setReportError(message.payload || "Không thể hiển thị báo cáo.");
      }
    } catch {
      // Ignore non-JSON messages from the WebView.
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          Platform.OS === "ios" ? styles.headerIos : styles.headerAndroid,
        ]}
      >
        <Text style={styles.title}>{title}</Text>

        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <DatePicker
          value={fromDate.replace(/\//g, "-")}
          placeholder="Chọn từ ngày (dd-MM-yyyy)"
          onChange={(val) => setFromDate(formatToSlash(val))}
        />

        <DatePicker
          value={toDate.replace(/\//g, "-")}
          placeholder="Chọn đến ngày (dd-MM-yyyy)"
          onChange={(val) => setToDate(formatToSlash(val))}
        />

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonLoading]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Thực hiện</Text>
          )}
        </TouchableOpacity>
      </View>

      {reportHtml ? (
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Ionicons name="refresh-outline" size={18} color={C.red} />
          </TouchableOpacity>

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
        </View>
      ) : null}

      <View style={styles.reportContainer}>
        {!reportHtml && !loading ? (
          <EmptyState
            iconName={
              reportError ? "alert-circle-outline" : "document-text-outline"
            }
            title={reportError || "Chưa có báo cáo"}
            subtitle={
              reportError
                ? "Vui lòng thử tải lại báo cáo."
                : "Chọn điều kiện và bấm Thực hiện để xem báo cáo."
            }
          />
        ) : null}

        {reportHtml ? (
          <>
            <WebView
              ref={webViewRef}
              originWhitelist={["*"]}
              source={{ html: reportHtml }}
              style={styles.reportWebView}
              javaScriptEnabled
              domStorageEnabled
              nestedScrollEnabled
              scalesPageToFit
              onMessage={handleWebViewMessage}
              onError={() => {
                setWebViewRendering(false);
                setReportError("Không thể hiển thị báo cáo.");
                setReportHtml(null);
              }}
            />

            {webViewRendering ? (
              <View style={styles.renderOverlay}>
                <ActivityIndicator color={C.red} />
                <Text style={styles.renderOverlayText}>
                  Đang hiển thị báo cáo...
                </Text>
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
};

export default ReportView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: C.red,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  headerIos: {
    paddingTop: 50,
  },
  headerAndroid: {
    paddingTop: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold" as const,
    color: "#fff",
  },
  form: {
    padding: 16,
    gap: 12,
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
  toolbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#fff",
  },
  toolbarButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E0E4EA",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  reportContainer: {
    flex: 1,
    backgroundColor: "#F5F6F8",
  },
  reportWebView: {
    flex: 1,
  },
  renderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    gap: 10,
  },
  renderOverlayText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
  },
});
