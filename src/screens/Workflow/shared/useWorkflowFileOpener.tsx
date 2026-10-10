import React, { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import RNFS from "react-native-fs";
import Share from "react-native-share";

import FileView from "../../../components/file/FileView";
import { viewWorkflowFile } from "../../../services/data/workflowApi";
import type { WorkflowApiBase } from "../../../types/index";
import { getWorkflowErrorMessage } from "./workflowErrors";
import { error } from "../../../utils/Logger";
import { getFileExtension, guessMimeType } from "./workflowAttachments";

/** Loại `FileView` hiện được ngay trong app. */
const IN_APP_TYPES = ["png", "jpg", "jpeg", "pdf"];

type ViewerState = {
  name: string;
  loadFile: () => Promise<string>;
} | null;

const safeFileName = (name: string) =>
  name.replace(/[\\/:*?"<>|]+/g, "_").trim() || "tep";

/**
 * Mở file của phiếu / công việc / bình luận / lịch sử (`flow-xem-file`, server
 * trả thẳng nội dung file). Ảnh và PDF xem ngay trong app; loại khác (Word,
 * Excel...) ghi ra bộ nhớ đệm rồi mở bằng bảng chia sẻ để chọn app đọc.
 *
 * Màn gọi phải render `viewer`.
 */
export function useWorkflowFileOpener() {
  const [viewer, setViewer] = useState<ViewerState>(null);
  const [opening, setOpening] = useState(false);

  const openFile = useCallback(
    async (apiBase: WorkflowApiBase, file: { id: number; name?: string | null }) => {
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
        Alert.alert("Không mở được file", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
      } finally {
        setOpening(false);
      }
    },
    [],
  );

  /* Giữ nguyên tham chiếu theo file đang mở: FileView tải lại mỗi khi `params`
     đổi, object mới mỗi lần màn cha render là tải lại liên tục. */
  const viewerParams = useMemo(
    () => (viewer ? { name: viewer.name, path: "", nameClass: "" } : null),
    [viewer],
  );

  const viewerElement = (
    <FileView
      visible={!!viewer}
      onClose={() => setViewer(null)}
      params={viewerParams as any}
      loadFile={viewer?.loadFile}
    />
  );

  return { openFile, opening, viewer: viewerElement };
}
