import React, { useCallback, useMemo, useRef, useState } from "react";
import { AppAlert } from "../../../components/ui/AppAlert";
import RNFS from "react-native-fs";
import Share from "react-native-share";

import FileView from "../../../components/file/FileView";
import ImagePreviewModal from "../../../components/ui/ImagePreviewModal";
import { viewWorkflowFile } from "../../../services/data/workflowApi";
import type { WorkflowApiBase, WorkflowPickedFile } from "../../../types/index";
import { getWorkflowErrorMessage } from "./workflowErrors";
import { error } from "../../../utils/Logger";
import { getFileExtension, guessMimeType, isImageFileName } from "./workflowAttachments";

/** Loại `FileView` hiện được ngay trong app. */
const IN_APP_TYPES = ["png", "jpg", "jpeg", "pdf"];

type ViewerState = {
  name: string;
  loadFile: () => Promise<string>;
} | null;

const safeFileName = (name: string) =>
  name.replace(/[\\/:*?"<>|]+/g, "_").trim() || "tep";

/** RNFS đọc đường dẫn thường, không nhận tiền tố file:// (content:// thì giữ). */
const toFsPath = (uri: string) =>
  uri.startsWith("file://") ? decodeURIComponent(uri.slice("file://".length)) : uri;

/**
 * Mở file của phiếu / công việc / bình luận / lịch sử (`flow-xem-file`, server
 * trả thẳng nội dung file). Ảnh và PDF xem ngay trong app; loại khác (Word,
 * Excel...) ghi ra bộ nhớ đệm rồi mở bằng bảng chia sẻ để chọn app đọc.
 *
 * `openLocalFile` mở file vừa chọn / vừa chụp, chưa tải lên server.
 *
 * Màn gọi phải render `viewer`.
 */
export function useWorkflowFileOpener() {
  const [viewer, setViewer] = useState<ViewerState>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  // Đọc trong callback cố định — state `opening` ở đó luôn là giá trị cũ.
  const openingRef = useRef(false);

  const openFile = useCallback(
    async (apiBase: WorkflowApiBase, file: { id: number; name?: string | null }) => {
      // Đang tải 1 file để mở: bấm thêm thì bỏ qua — khỏi tải trùng, khỏi bật
      // 2 bảng chia sẻ.
      if (openingRef.current) return;
      const name = file.name || `tep_${file.id}`;
      const ext = getFileExtension(name);

      if (IN_APP_TYPES.includes(ext)) {
        setViewer({
          name,
          loadFile: async () => (await viewWorkflowFile(apiBase, file.id)).base64,
        });
        return;
      }

      try {
        openingRef.current = true;
        setOpening(true);
        const { base64, contentType } = await viewWorkflowFile(apiBase, file.id);
        const path = `${RNFS.CachesDirectoryPath}/${file.id}_${safeFileName(name)}`;

        await RNFS.writeFile(path, base64, "base64");
        await Share.open({
          url: `file://${path}`,
          type: contentType || guessMimeType(name),
          filename: name,
          failOnCancel: false,
        });
      } catch (err) {
        error("[useWorkflowFileOpener] open file error", err);
        AppAlert.alert("Không mở được file", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
      } finally {
        openingRef.current = false;
        setOpening(false);
      }
    },
    [],
  );

  const openLocalFile = useCallback(async (file: WorkflowPickedFile) => {
    // Ảnh đọc thẳng từ máy, khỏi đổi sang base64.
    if (isImageFileName(file.name) || file.type?.startsWith("image/")) {
      setLocalImageUri(file.uri);
      return;
    }

    if (getFileExtension(file.name) === "pdf") {
      setViewer({
        name: file.name,
        loadFile: () => RNFS.readFile(toFsPath(file.uri), "base64"),
      });
      return;
    }

    try {
      await Share.open({
        url: file.uri,
        type: file.type || guessMimeType(file.name),
        filename: file.name,
        failOnCancel: false,
      });
    } catch (err) {
      error("[useWorkflowFileOpener] open local file error", err);
      AppAlert.alert("Không mở được file", "Vui lòng thử lại.");
    }
  }, []);

  /* Giữ nguyên tham chiếu theo file đang mở: FileView tải lại mỗi khi `params`
     đổi, object mới mỗi lần màn cha render là tải lại liên tục. */
  const viewerParams = useMemo(
    () => (viewer ? { name: viewer.name, path: "", nameClass: "" } : null),
    [viewer],
  );

  const viewerElement = (
    <>
      <FileView
        visible={!!viewer}
        onClose={() => setViewer(null)}
        params={viewerParams as any}
        loadFile={viewer?.loadFile}
      />
      <ImagePreviewModal uri={localImageUri} onClose={() => setLocalImageUri(null)} />
    </>
  );

  return { openFile, openLocalFile, opening, viewer: viewerElement };
}
