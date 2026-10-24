import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "../../../components/ui/EmptyState";
import IsLoading from "../../../components/ui/IconLoading";
import { cvThongTin } from "../../../services/data/congViecApi";
import {
  addWorkflowComment,
  getWorkflowComments,
  recallWorkflowComment,
} from "../../../services/data/workflowApi";
import type {
  StackRoute,
  WorkflowComment,
  WorkflowPickedFile,
} from "../../../types/index";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import { warn } from "../../../utils/Logger";
import { useAttachmentPicker } from "../shared/components/AttachmentPicker";
import CommentActionSheet, {
  COMMENT_SHEET_CLOSE_DELAY,
} from "../shared/components/CommentActionSheet";
import ReplySwipeRow, { replyHaptic } from "../shared/components/ReplySwipeRow";
import WorkflowCommentsSkeleton from "../shared/components/WorkflowCommentsSkeleton";
import TypingIndicator from "../shared/components/TypingIndicator";
import WorkflowFileImage from "../shared/components/WorkflowFileImage";
import { useWorkflowFileOpener } from "../shared/useWorkflowFileOpener";
import { useWorkflowMe } from "../shared/useWorkflowMe";
import { useMarkWorkflowChanged } from "../shared/useWorkflowVersion";
import {
  formatFileSizeKb,
  isImageFileName,
} from "../shared/workflowAttachments";
import { formatBeDate } from "../shared/workflowDate";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import { useNotifyInfoStaleOnClose } from "../shared/workflowInfoRefresh";
import {
  applyThuHoi,
  getReplyPreview,
  mergeRealtimeComment,
  THU_HOI_TEXT,
} from "./realtimeCommentRules";
import { useRealtimeComments } from "./useRealtimeComments";
import { AppAlert } from "../../../components/ui/AppAlert";
import { showAppToast } from "../../../components/ui/AppToast";

/**
 * Bình luận dạng chat — dùng chung phiếu đề nghị (`/{TenBang}/flow-*`) và
 * công việc (`/CV_CongViec/flow-*`). Chỉ thêm, không sửa / xoá; bình luận của
 * mình dồn phải. Mỗi bình luận kèm tối đa 1 file 20MB.
 *
 * Realtime (7-Mobile-Realtime-BinhLuan): bình luận người khác gửi hiện ngay,
 * "{Tên} đang nhập" cuối khung. Mất realtime thì vẫn chạy như cũ.
 *
 * Trả lời (mục 7): giữ hoặc vuốt 1 tin → khung "Đang trả lời" trên ô nhập. Tin
 * trả lời có khối trích dẫn ở đầu, bấm vào thì cuộn tới tin gốc và nháy sáng.
 *
 * Thu hồi (mục 8): giữ tin CỦA MÌNH → sheet Trả lời · Thu hồi (tin người khác
 * giữ là trả lời luôn). Server tự chặn quá 24 giờ — câu báo hiện nguyên văn.
 * Tin đã thu hồi vẫn giữ chỗ, chỉ còn tên + giờ + "Tin nhắn đã được thu hồi".
 */
/** Cách cuối danh sách chừng này px vẫn coi là "đang ở cuối". */
const NEAR_BOTTOM_PX = 80;
/** Tin gốc khi nhảy tới nằm ở chừng này chiều cao khung (0 = mép trên). */
const JUMP_VIEW_POSITION = 0.4;
/** Nháy sáng tin gốc: chờ cuộn xong rồi sáng lên, giữ, tắt — tổng ~1,5 giây. */
const FLASH_CLEAR_MS = 2000;

export default function WorkflowCommentsScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  const route = useRoute<StackRoute<"WorkflowBinhLuan">>();
  const { apiBase, idHoSo } = route.params;
  const { me, loading: meLoading } = useWorkflowMe();
  const markChanged = useMarkWorkflowChanged();
  const fileOpener = useWorkflowFileOpener();
  const listRef = useRef<FlatList<WorkflowComment>>(null);
  const inputRef = useRef<TextInput>(null);
  // Đang ở (gần) cuối danh sách thì nội dung đổi cỡ mới kéo về cuối — người đang
  // cuộn lên đọc tin cũ không bị giật xuống khi ảnh tải xong / có người nhập.
  const atBottomRef = useRef(true);
  // Mở màn: nạp chữ, nhảy thẳng xuống tin cuối 1 lần (không animation) rồi mới
  // nạp ảnh; sau đó tin mới đến thì cuộn trượt (tài liệu 7 mục 5).
  const [jumpedToEnd, setJumpedToEnd] = useState(false);

  // null = đang hỏi quyền (mở thẳng từ thông báo công việc): chưa hiện ô soạn
  // lẫn dòng "chỉ xem".
  const [canSend, setCanSend] = useState<boolean | null>(route.params.canSend ?? null);
  const [items, setItems] = useState<WorkflowComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<WorkflowPickedFile | null>(null);
  const [sending, setSending] = useState(false);
  const picker = useAttachmentPicker(
    (files) => setFile(files[0] ?? null),
    false,
  );
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [replyTo, setReplyTo] = useState<WorkflowComment | null>(null);
  // Tin của mình đang giữ — mở sheet Trả lời · Thu hồi.
  const [actionFor, setActionFor] = useState<WorkflowComment | null>(null);
  // Tin vừa nhảy tới từ khối trích dẫn — key đổi mỗi lần để nháy lại được.
  const [flash, setFlash] = useState<{ id: number; key: number } | null>(null);
  const scrollRetryRef = useRef(0);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), FLASH_CLEAR_MS);
    return () => clearTimeout(timer);
  }, [flash]);

  /* iOS: đẩy ô soạn lên đúng bằng bàn phím. Không dùng KeyboardAvoidingView vì
     nó cần biết chiều cao header (header tự vẽ) mới tính đúng offset. Android
     đã có adjustResize trong manifest. */
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const show = Keyboard.addListener("keyboardWillShow", (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener("keyboardWillHide", () =>
      setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const rows = await getWorkflowComments(apiBase, idHoSo);
      setItems(rows);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(
        getWorkflowErrorMessage(err, "Không tải được bình luận."),
      );
    } finally {
      setLoading(false);
    }
  }, [apiBase, idHoSo]);

  useEffect(() => {
    load();
  }, [load]);

  // Như danh sách Công việc: cv-thong-tin trả sẵn cờ duocTraoDoi.
  useEffect(() => {
    if (route.params.canSend != null) return;
    let active = true;
    cvThongTin([idHoSo])
      .then((rows) => active && setCanSend(!!rows[0]?.duocTraoDoi))
      .catch((err) => {
        warn("[BinhLuan] Tải quyền trao đổi thất bại", err);
        if (active) setCanSend(false);
      });
    return () => {
      active = false;
    };
  }, [idHoSo, route.params.canSend]);

  // apiBase chính là tenBang của phòng ("Ticket_PhongBan" / "CV_CongViec").
  const realtime = useRealtimeComments({
    tenBang: apiBase,
    idHoSo,
    myId: me.iD_NhanVien,
    onBinhLuanMoi: (comment) =>
      setItems((prev) => mergeRealtimeComment(prev, comment)),
    onBinhLuanThuHoi: (idBinhLuan) => applyRecalled(idBinhLuan),
    onReconnected: load,
  });

  useNotifyInfoStaleOnClose(apiBase);

  const send = async () => {
    const noiDung = text.trim();
    if (!noiDung && !file) return;

    try {
      setSending(true);
      await addWorkflowComment(apiBase, idHoSo, noiDung, file, replyTo?.id);
      setText("");
      setFile(null);
      setReplyTo(null);
      // Gửi xong thì hạ bàn phím, bỏ focus ô nhập (cũng là thôi "đang nhập").
      inputRef.current?.blur();
      Keyboard.dismiss();
      atBottomRef.current = true;
      await load();
      markChanged();
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: true }),
      );
    } catch (err) {
      AppAlert.alert(
        "Không gửi được",
        getWorkflowErrorMessage(err, "Vui lòng thử lại."),
      );
    } finally {
      setSending(false);
    }
  };

  /** Tin vừa bị thu hồi: xoá nội dung trên màn; đang trả lời / mở sheet đúng tin đó thì bỏ. */
  function applyRecalled(idBinhLuan: number) {
    setItems((prev) => applyThuHoi(prev, idBinhLuan));
    setReplyTo((prev) => (prev?.id === idBinhLuan ? null : prev));
    setActionFor((prev) => (prev?.id === idBinhLuan ? null : prev));
  }

  const recall = async (item: WorkflowComment) => {
    try {
      const loi = await recallWorkflowComment(apiBase, item.id);
      if (loi) {
        // Quá 24 giờ, đã thu hồi trước đó... — hiện nguyên câu server báo.
        showAppToast({ message: loi, tone: "warning" });
        return;
      }
      applyRecalled(item.id);
      markChanged();
    } catch (err) {
      showAppToast({
        message: getWorkflowErrorMessage(
          err,
          "Không thu hồi được. Vui lòng thử lại.",
        ),
        tone: "warning",
      });
    }
  };

  const confirmRecall = (item: WorkflowComment) => {
    setActionFor(null);
    setTimeout(
      () =>
        AppAlert.alert("Xác nhận thu hồi tin nhắn?", ``, [
          { text: "Huỷ", style: "cancel" },
          {
            text: "Thu hồi",
            style: "destructive",
            onPress: () => recall(item),
          },
        ]),
      COMMENT_SHEET_CLOSE_DELAY,
    );
  };

  const replyFromSheet = (item: WorkflowComment) => {
    setActionFor(null);
    setReplyTo(item);
    setTimeout(() => inputRef.current?.focus(), COMMENT_SHEET_CLOSE_DELAY);
  };

  /** Mở khung "Đang trả lời" rồi đưa con trỏ vào ô nhập. */
  const startReply = (item: WorkflowComment) => {
    if (!canSend) return;
    setReplyTo(item);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  /** Cuộn tới tin gốc (theo id) và nháy sáng nó. */
  const jumpToComment = (id?: number | null) => {
    const index = id ? items.findIndex((item) => item.id === id) : -1;
    if (index < 0) return;
    // Đang cuộn đi chỗ khác: nội dung đổi cỡ giữa chừng không được kéo về cuối.
    atBottomRef.current = false;
    scrollRetryRef.current = 0;
    listRef.current?.scrollToIndex({
      index,
      viewPosition: JUMP_VIEW_POSITION,
      animated: true,
    });
    setFlash({ id: items[index].id, key: Date.now() });
  };

  const renderItem = ({ item }: { item: WorkflowComment }) => {
    const mine =
      !!me.iD_NhanVien && Number(item.iD_NhanVien) === me.iD_NhanVien;
    // Ảnh (chụp / chọn từ máy) đứng riêng ngoài bong bóng như Zalo / Messenger;
    // chữ và file khác vẫn nằm trong bong bóng.
    // Tin đã thu hồi: bong bóng viền rỗng, chữ nghiêng xám, không còn thao tác.
    const recalled = !!item.isThuHoi;
    const isImage =
      !recalled && !!item.iD_File && isImageFileName(item.tenFile);
    const hasBubble =
      recalled || !!item.noiDung || (!!item.iD_File && !isImage);
    const onRed = mine && !recalled;
    const canReply = !!canSend && !recalled;
    const time = formatBeDate(item.ngayTao, true);
    // Giữ tin: của mình → sheet Trả lời · Thu hồi; người khác → trả lời luôn.
    const onLongPressMessage = recalled
      ? undefined
      : mine
      ? () => {
          replyHaptic();
          setActionFor(item);
        }
      : canReply
      ? () => {
          replyHaptic();
          startReply(item);
        }
      : undefined;
    // Khối trích dẫn ở đầu bong bóng; tin là ảnh (ảnh nằm ngoài bong bóng) thì
    // khối đứng riêng ngay trên ảnh.
    const quoteOnRed = onRed && !isImage;
    const quotePreview = item.traLoi_ThuHoi
      ? THU_HOI_TEXT
      : getReplyPreview(item.traLoi_NoiDung, item.traLoi_TenFile);
    const quote =
      item.iD_TraLoi && !recalled ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => jumpToComment(item.iD_TraLoi)}
          onLongPress={onLongPressMessage}
          accessibilityRole="button"
          accessibilityHint="Xem tin được trả lời"
          style={[
            styles.quote,
            quoteOnRed && styles.quoteMine,
            isImage && styles.quoteBare,
          ]}
        >
          <View style={[styles.quoteBar, quoteOnRed && styles.quoteBarMine]} />
          <View style={styles.quoteBody}>
            <Text
              style={[styles.quoteName, quoteOnRed && styles.messageTextMine]}
              numberOfLines={1}
            >
              {item.traLoi_Ten || "Bình luận"}
            </Text>
            {quotePreview ? (
              <Text
                style={[
                  styles.quoteText,
                  quoteOnRed && styles.quoteTextMine,
                  item.traLoi_ThuHoi && styles.italic,
                ]}
                numberOfLines={1}
              >
                {quotePreview}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      ) : null;

    return (
      <ReplySwipeRow
        mine={mine}
        enabled={canReply}
        onReply={() => startReply(item)}
      >
        <View style={[styles.messageRow, mine && styles.messageRowMine]}>
          {flash?.id === item.id ? (
            <FlashHighlight key={flash.key} style={styles.flash} />
          ) : null}
          <View style={[styles.stack, mine && styles.stackMine]}>
            {!mine && (isImage || !hasBubble) ? (
              <Text style={[styles.author, styles.authorBare]}>
                {item.iD_NhanVien_MoTa}
              </Text>
            ) : null}
            {isImage ? quote : null}
            {isImage ? (
              <WorkflowFileImage
                defer={!jumpedToEnd}
                apiBase={apiBase}
                fileId={Number(item.iD_File)}
                name={item.tenFile}
                onPress={() =>
                  fileOpener.openFile(apiBase, {
                    id: Number(item.iD_File),
                    name: item.tenFile,
                  })
                }
                onLongPress={onLongPressMessage}
              />
            ) : null}
            {hasBubble ? (
              <Pressable
                onLongPress={onLongPressMessage}
                delayLongPress={350}
                style={[
                  styles.bubble,
                  mine ? styles.bubbleMine : styles.bubbleOther,
                  recalled && styles.bubbleRecalled,
                  isImage && styles.bubbleAfterImage,
                ]}
              >
                {!mine && !isImage ? (
                  <Text style={styles.author}>{item.iD_NhanVien_MoTa}</Text>
                ) : null}
                {isImage ? null : quote}
                {recalled ? (
                  <Text style={[styles.messageText, styles.recalledText]}>
                    {THU_HOI_TEXT}
                  </Text>
                ) : null}
                {item.noiDung && !recalled ? (
                  <Text
                    style={[styles.messageText, mine && styles.messageTextMine]}
                  >
                    {item.noiDung}
                  </Text>
                ) : null}
                {item.iD_File && !isImage && !recalled ? (
                  <TouchableOpacity
                    style={[styles.fileChip, mine && styles.fileChipMine]}
                    onPress={() =>
                      fileOpener.openFile(apiBase, {
                        id: Number(item.iD_File),
                        name: item.tenFile,
                      })
                    }
                  >
                    <Ionicons
                      name="document-attach-outline"
                      size={16}
                      color={mine ? "#FFFFFF" : c.accent}
                    />
                    <Text
                      style={[styles.fileName, mine && styles.messageTextMine]}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {item.tenFile ?? "Tệp đính kèm"}
                    </Text>
                    {item.fileSize ? (
                      <Text
                        style={[
                          styles.fileSize,
                          mine && styles.messageTextMine,
                        ]}
                      >
                        {formatFileSizeKb(item.fileSize)}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ) : null}
                <Text style={[styles.time, onRed && styles.timeMine]}>
                  {time}
                </Text>
              </Pressable>
            ) : (
              <Text style={[styles.time, styles.timeBare]}>{time}</Text>
            )}
          </View>
        </View>
      </ReplySwipeRow>
    );
  };

  const composerPaddingBottom = keyboardHeight
    ? 10
    : Math.max(insets.bottom, 10);

  return (
    <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
      {/* Chờ cả người đăng nhập: chưa biết là ai thì mọi tin vẽ thành của người
          khác rồi mới lật sang phải. */}
      {loading || meLoading ? (
        <WorkflowCommentsSkeleton />
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          extraData={flash}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => {
            if (!jumpedToEnd) {
              listRef.current?.scrollToEnd({ animated: false });
              requestAnimationFrame(() => setJumpedToEnd(true));
              return;
            }
            if (atBottomRef.current)
              listRef.current?.scrollToEnd({ animated: true });
          }}
          onScroll={({ nativeEvent }) => {
            const { contentOffset, contentSize, layoutMeasurement } =
              nativeEvent;
            atBottomRef.current =
              contentOffset.y + layoutMeasurement.height >=
              contentSize.height - NEAR_BOTTOM_PX;
          }}
          scrollEventThrottle={64}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            // Tin gốc ở xa chưa được dựng: nhảy tới chỗ ước lượng rồi thử lại.
            if (scrollRetryRef.current++ >= 3) return;
            listRef.current?.scrollToOffset({
              offset: averageItemLength * index,
              animated: false,
            });
            setTimeout(
              () =>
                listRef.current?.scrollToIndex({
                  index,
                  viewPosition: JUMP_VIEW_POSITION,
                  animated: true,
                }),
              100,
            );
          }}
          // Chạm vào vùng tin nhắn (bấm hay kéo) = bỏ focus ô nhập. onTouchStart
          // không giành thao tác chạm nên cuộn và bấm ảnh / file vẫn như thường.
          onTouchStart={Keyboard.dismiss}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListFooterComponent={
            realtime.dangNhapLabel ? (
              <TypingIndicator label={realtime.dangNhapLabel} />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              iconName="chatbubbles-outline"
              title={
                errorMessage ? "Không tải được bình luận" : "Chưa có bình luận"
              }
              subtitle={errorMessage ?? undefined}
              actionLabel={errorMessage ? "Thử lại" : undefined}
              onActionPress={errorMessage ? load : undefined}
            />
          }
        />
      )}

      {canSend == null ? null : canSend ? (
        <View
          style={[styles.composer, { paddingBottom: composerPaddingBottom }]}
        >
          {replyTo ? (
            <View style={styles.replyBar}>
              <View style={styles.quoteBar} />
              <TouchableOpacity
                style={styles.quoteBody}
                activeOpacity={0.7}
                onPress={() => jumpToComment(replyTo.id)}
              >
                <Text style={styles.replyTitle} numberOfLines={1}>
                  Đang trả lời{" "}
                  <Text style={styles.replyName}>
                    {replyTo.iD_NhanVien_MoTa || "bình luận"}
                  </Text>
                </Text>
                <Text style={styles.quoteText} numberOfLines={1}>
                  {getReplyPreview(replyTo.noiDung, replyTo.tenFile)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setReplyTo(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Huỷ trả lời"
              >
                <Ionicons name="close" size={20} color={c.textSub} />
              </TouchableOpacity>
            </View>
          ) : null}
          {file ? (
            <TouchableOpacity
              style={styles.pendingFile}
              activeOpacity={0.7}
              onPress={() => fileOpener.openLocalFile(file)}
            >
              {isImageFileName(file.name) || file.type?.startsWith("image/") ? (
                <Image source={{ uri: file.uri }} style={styles.pendingThumb} />
              ) : (
                <Ionicons
                  name="document-attach-outline"
                  size={16}
                  color={c.accent}
                />
              )}
              <Text
                style={styles.pendingName}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {file.name}
              </Text>
              <TouchableOpacity onPress={() => setFile(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={c.textSub} />
              </TouchableOpacity>
            </TouchableOpacity>
          ) : null}
          <View style={styles.inputRow}>
            <TouchableOpacity
              onPress={picker.open}
              style={styles.iconButton}
              disabled={sending}
            >
              <Ionicons name="attach" size={22} color={c.textSub} />
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              onFocus={() => realtime.setComposerFocused(true)}
              onBlur={() => realtime.setComposerFocused(false)}
              placeholder="Viết bình luận..."
              placeholderTextColor={c.placeholder}
              multiline
              style={styles.input}
            />
            <TouchableOpacity
              onPress={send}
              disabled={sending || (!text.trim() && !file)}
              style={[
                styles.sendButton,
                (sending || (!text.trim() && !file)) && styles.sendDisabled,
              ]}
            >
              {sending ? (
                <IsLoading
                  size="small"
                  color="#FFFFFF"
                  style={styles.flexNone}
                />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text
          style={[
            styles.readOnly,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          Bạn chỉ xem được bình luận.
        </Text>
      )}

      {picker.sheet}
      <CommentActionSheet
        comment={actionFor}
        canReply={!!canSend}
        onReply={replyFromSheet}
        onRecall={confirmRecall}
        onClose={() => setActionFor(null)}
      />
      {fileOpener.viewer}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    listContent: {
      padding: 12,
      flexGrow: 1,
    },
    messageRow: {
      flexDirection: "row",
      marginBottom: 10,
    },
    messageRowMine: {
      justifyContent: "flex-end",
    },
    stack: {
      maxWidth: "82%",
      alignItems: "flex-start",
    },
    stackMine: {
      alignItems: "flex-end",
    },
    bubble: {
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    bubbleAfterImage: {
      marginTop: 4,
    },
    bubbleOther: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 4,
    },
    bubbleMine: {
      backgroundColor: c.red,
      borderTopRightRadius: 4,
    },
    bubbleRecalled: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    recalledText: {
      fontStyle: "italic",
      color: c.textSub,
    },
    italic: {
      fontStyle: "italic",
    },
    // Nháy sáng cả hàng (tràn ra lề danh sách) khi nhảy tới tin gốc.
    flash: {
      position: "absolute",
      top: -5,
      bottom: -5,
      left: -12,
      right: -12,
      backgroundColor: `${c.accent}26`,
    },
    quote: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 6,
      paddingVertical: 5,
      paddingLeft: 6,
      paddingRight: 10,
      borderRadius: 8,
      backgroundColor: c.accentLight,
    },
    quoteMine: {
      backgroundColor: "rgba(255,255,255,0.18)",
    },
    // Đứng riêng trên ảnh: không có bong bóng bọc ngoài.
    quoteBare: {
      maxWidth: 280,
      marginBottom: 4,
    },
    quoteBar: {
      alignSelf: "stretch",
      width: 3,
      borderRadius: 2,
      backgroundColor: c.accent,
    },
    quoteBarMine: {
      backgroundColor: "#FFFFFF",
    },
    quoteBody: {
      flexShrink: 1,
      flexGrow: 1,
    },
    quoteName: {
      fontSize: 12,
      fontWeight: "700",
      color: c.accent,
    },
    quoteText: {
      fontSize: 13,
      color: c.textSub,
    },
    quoteTextMine: {
      color: "rgba(255,255,255,0.85)",
    },
    author: {
      fontSize: 12,
      fontWeight: "700",
      color: c.accent,
      marginBottom: 2,
    },
    authorBare: {
      marginLeft: 4,
    },
    messageText: {
      fontSize: 15,
      color: c.text,
    },
    messageTextMine: {
      color: "#FFFFFF",
    },
    fileChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: c.accentLight,
    },
    fileChipMine: {
      backgroundColor: "rgba(255,255,255,0.18)",
    },
    fileName: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: "600",
      color: c.accent,
    },
    fileSize: {
      fontSize: 11,
      color: c.textSub,
    },
    time: {
      fontSize: 11,
      color: c.textSub,
      marginTop: 4,
      alignSelf: "flex-end",
    },
    timeMine: {
      color: "rgba(255,255,255,0.8)",
    },
    // Giờ dưới ảnh đứng riêng: chữ xám trên nền màn, không có bong bóng.
    timeBare: {
      alignSelf: "auto",
      marginHorizontal: 4,
    },
    composer: {
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
      paddingHorizontal: 10,
      paddingTop: 8,
    },
    replyBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 6,
      paddingLeft: 8,
      paddingRight: 10,
      marginBottom: 6,
      borderRadius: 10,
      backgroundColor: c.accentLight,
    },
    replyTitle: {
      fontSize: 12,
      color: c.textSub,
    },
    replyName: {
      fontWeight: "700",
      color: c.accent,
    },
    pendingFile: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 6,
      borderRadius: 10,
      backgroundColor: c.accentLight,
    },
    pendingName: {
      flex: 1,
      fontSize: 13,
      color: c.accent,
    },
    pendingThumb: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: c.surfaceAlt,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 6,
    },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    input: {
      flex: 1,
      maxHeight: 120,
      minHeight: 40,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 10,
      fontSize: 15,
      color: c.text,
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.red,
      alignItems: "center",
      justifyContent: "center",
    },
    sendDisabled: {
      opacity: 0.45,
    },
    flexNone: {
      flex: 0,
    },
    readOnly: {
      textAlign: "center",
      fontSize: 13,
      color: c.textSub,
      paddingTop: 10,
      backgroundColor: c.surface,
    },
  });

/** Nền sáng lên rồi tắt ~1,5 giây sau khi cuộn tới (đợi cuộn xong mới sáng). */
function FlashHighlight({ style }: { style: object }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(250),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(900),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View pointerEvents="none" style={[style, { opacity }]} />;
}
