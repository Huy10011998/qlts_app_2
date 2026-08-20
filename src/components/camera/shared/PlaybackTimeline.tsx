import React from "react";
import { UnscaledText } from "../../../utils/helpers/textScaling";
import { Animated, FlatList, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { C, useAppColors, useStyles } from "../../../utils/helpers/colors";
import EmptyState from "../../ui/EmptyState";
import IsLoading from "../../ui/IconLoading";
import BottomSheetModalShell from "../../shared/BottomSheetModalShell";
import {
  formatClock,
  getRowLowerSec,
  type PlaybackClip,
  type PlaybackClipGroup,
} from "./cameraPlaybackHelpers";
import { makeStyles, TIMELINE_ROW_HEIGHT } from "../CameraPlayback.styles";

type PlaybackTimelineProps = {
  activeClipId: string | null;
  activeGroupId: string | null;
  emptySubtitle: string;
  errorMessage: string | null;
  groups: PlaybackClipGroup[];
  groupSheetHeight: number;
  onCloseGroup: () => void;
  onOpenGroup: (group: PlaybackClipGroup) => void;
  onSelectGroup: (group: PlaybackClipGroup, clipId?: string) => void;
  openedGroupId: string | null;
  isLoading: boolean;
  /** Mốc đang phát (giây trong ngày) để vẽ vạch trên rail; null khi xem live. */
  playheadSec: number | null;
  /** Đoạn rail kéo thêm dưới hàng cuối, phủ vùng chừa để cuộn tới mốc sớm nhất. */
  railTailHeight: number;
  /** Hệ số zoom timeline — giãn/thu chiều cao mỗi nhóm. */
  scale: number;
  viewMode: "timeline" | "grid";
};

/**
 * Mốc đang phát rơi vào hàng nào và ở vị trí nào (0..1 tính từ mép trên). Trả
 * null cho các hàng khác, nhờ vậy chỉ hàng chứa mốc đó phải render lại mỗi nhịp
 * tiến trình — các hàng còn lại giữ nguyên memo.
 */
const getPlayheadOffset = (
  groups: PlaybackClipGroup[],
  index: number,
  playheadSec: number | null,
): number | null => {
  if (playheadSec === null) return null;

  const upperSec = groups[index].startSec;
  const lowerSec = getRowLowerSec(groups, index);
  if (playheadSec > upperSec || playheadSec < lowerSec) return null;

  const spanSec = Math.max(1, upperSec - lowerSec);
  return Math.min(1, Math.max(0, (upperSec - playheadSec) / spanSec));
};

const TimelineRow = React.memo(function TimelineRow({
  activeGroupId,
  group,
  onOpenGroup,
  playheadOffset,
  rowHeight,
}: {
  activeGroupId: string | null;
  group: PlaybackClipGroup;
  onOpenGroup: (group: PlaybackClipGroup) => void;
  /** Vị trí 0..1 của mốc đang phát trong hàng này; null nếu không thuộc hàng. */
  playheadOffset: number | null;
  rowHeight: number;
}) {
  const c = useAppColors();
  const styles = useStyles(makeStyles);
  const isActive = group.id === activeGroupId;

  return (
    <View style={[styles.timelineRow, { height: rowHeight }]}>
      {/* Nhãn giờ nằm ở MÉP DƯỚI hàng: trong một hàng thời gian giảm dần từ trên
          xuống, nên mép dưới mới là mốc h:00, còn mép trên là mốc mới nhất của
          giờ đó (thường là h+1:00). Đặt ở mép trên là lệch đúng một hàng. Gạch
          nhỏ đi trước nhãn để thành tick ranh giới giờ.
          Thời gian chính xác do badge ngoài vùng cuộn hiển thị, nên ở đây luôn
          là nhãn thường. */}
      <View style={styles.timelineLabelCol}>
        <View style={styles.timelineLabelDash} />
        <UnscaledText
          style={[styles.timelineLabel, isActive && styles.timelineLabelActive]}
          allowFontScaling={false}
        >
          {`${String(group.hour).padStart(2, "0")}:00`}
        </UnscaledText>
      </View>

      <View style={styles.timelineRailCol}>
        {group.coverageSegments.map((segment, index) => (
          <View
            key={`${group.id}-cover-${index}`}
            style={[
              styles.timelineCoverage,
              isActive && styles.timelineCoverageActive,
              {
                top: Math.round(segment.from * rowHeight),
                height: Math.max(
                  2,
                  Math.round((segment.to - segment.from) * rowHeight),
                ),
              },
            ]}
          />
        ))}

        {/* Vạch mốc đang phát: biết đang ở đâu trong giờ này mà không cần đọc
            badge. Chỉ hàng chứa mốc đó nhận playheadOffset khác null. */}
        {playheadOffset !== null ? (
          <View
            style={[
              styles.timelinePlayhead,
              { top: Math.round(playheadOffset * rowHeight) },
            ]}
            pointerEvents="none"
          />
        ) : null}
      </View>

      <View style={styles.timelineClipCol}>
        <TouchableOpacity
          style={[styles.clipCard, isActive && styles.clipCardActive]}
          activeOpacity={0.85}
          onPress={() => onOpenGroup(group)}
          accessibilityLabel={`Phát ${group.clipCount} clip lúc ${formatClock(
            group.startSec,
          )}`}
        >
          <View style={[styles.clipPlayCircle, isActive && styles.clipPlayCircleActive]}>
            <Ionicons name="play" size={18} color={isActive ? "#fff" : c.red} />
          </View>

          <View style={styles.clipCardBody}>
            <Text
              style={[
                styles.clipCardTime,
                isActive && styles.clipCardTimeActive,
              ]}
              numberOfLines={1}
            >
              {`${String(group.hour).padStart(2, "0")}:00 – ${String(
                (group.hour + 1) % 24,
              ).padStart(2, "0")}:00`}
            </Text>
            {/* Mức phủ nằm trên rail rồi nên thẻ chỉ còn con số. */}
            <Text style={styles.clipCardMeta}>
              {`${group.clipCount} clip · ${Math.floor(
                group.durationSec / 60,
              )}'${String(group.durationSec % 60).padStart(2, "0")}"`}
            </Text>
          </View>
        </TouchableOpacity>

        {group.hasPerson ? (
          <View style={styles.personChip}>
            <Ionicons name="body-outline" size={18} color={C.red} />
          </View>
        ) : null}
      </View>
    </View>
  );
});

const ClipCard = React.memo(function ClipCard({
  activeClipId,
  clip,
  group,
  onSelectGroup,
}: {
  activeClipId: string | null;
  clip: PlaybackClip;
  group: PlaybackClipGroup;
  onSelectGroup: (group: PlaybackClipGroup, clipId?: string) => void;
}) {
  const c = useAppColors();
  const styles = useStyles(makeStyles);
  const isActive = clip.id === activeClipId;
  // Dải phủ trong ô lưới: vị trí của clip trong giờ của nó (cùng cách đọc như
  // thẻ trên timeline), thay cho ảnh snapshot vốn luôn là frame hiện tại.
  const hourStartSec = group.hour * 3600;
  const coverFrom = Math.max(0, clip.startSec - hourStartSec);
  const coverTo = Math.min(3600, coverFrom + clip.durationSec);

  return (
    <TouchableOpacity
      style={[
        styles.playbackGridCard,
        isActive && styles.playbackGridCardActive,
      ]}
      activeOpacity={0.85}
      onPress={() => onSelectGroup(group, clip.id)}
      accessibilityLabel={`Phát bản ghi lúc ${formatClock(clip.startSec)}`}
    >
      <View style={styles.playbackGridTopRow}>
        <Text
          style={[
            styles.playbackGridTime,
            isActive && styles.playbackGridTimeActive,
          ]}
        >
          {formatClock(clip.startSec, false)}
        </Text>
        {group.hasPerson ? (
          <Ionicons name="body-outline" size={15} color={c.red} />
        ) : null}
      </View>

      <View style={styles.clipCoverageTrack}>
        {coverTo > coverFrom ? (
          <View
            style={[
              styles.clipCoverageFill,
              isActive && styles.clipCoverageFillActive,
              {
                left: `${(coverFrom / 3600) * 100}%`,
                width: `${((coverTo - coverFrom) / 3600) * 100}%`,
              },
            ]}
          />
        ) : null}
      </View>

      <View style={styles.playbackGridBottomRow}>
        <Text style={styles.playbackGridDuration}>
          {`${Math.floor(clip.durationSec / 60)}'${String(
            clip.durationSec % 60,
          ).padStart(2, "0")}"`}
        </Text>
        <View
          style={[
            styles.playbackGridPlay,
            isActive && styles.clipPlayCircleActive,
          ]}
        >
          <Ionicons name="play" size={13} color={isActive ? "#fff" : c.red} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const ClipGridGroup = React.memo(function ClipGridGroup({
  activeClipId,
  group,
  onSelectGroup,
}: {
  activeClipId: string | null;
  group: PlaybackClipGroup;
  onSelectGroup: (group: PlaybackClipGroup, clipId?: string) => void;
}) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.playbackGridGroup}>
      <View style={styles.playbackGridHourRow}>
        <Text style={styles.playbackGridHour}>
          {`${String(group.hour).padStart(2, "0")}:00`}
        </Text>
        <View style={styles.playbackGridHourRule} />
        <Text style={styles.playbackGridHourCount}>
          {`${group.clipCount} clip`}
        </Text>
      </View>
      <View style={styles.playbackGridClips}>
        {group.clips.map((clip) => (
          <ClipCard
            key={clip.id}
            activeClipId={activeClipId}
            clip={clip}
            group={group}
            onSelectGroup={onSelectGroup}
          />
        ))}
      </View>
    </View>
  );
});

/**
 * Đồng hồ live/tiến trình phát làm CameraPlayback re-render mỗi giây (và mỗi
 * frame khi cuộn). Không memo thì toàn bộ row + thumbnail bị dựng lại theo.
 */
function PlaybackTimeline({
  activeClipId,
  activeGroupId,
  emptySubtitle,
  errorMessage,
  groups,
  groupSheetHeight,
  onCloseGroup,
  onOpenGroup,
  onSelectGroup,
  openedGroupId,
  isLoading,
  playheadSec,
  railTailHeight,
  scale,
  viewMode,
}: PlaybackTimelineProps) {
  const c = useAppColors();
  const styles = useStyles(makeStyles);
  // Sau lần mở đầu tiên, giữ grid mounted và chỉ ẩn đi khi chuyển về timeline.
  // Nhờ vậy thumbnail không bị tạo lại/tải lại mỗi lần đổi giao diện.
  const [hasOpenedGrid, setHasOpenedGrid] = React.useState(viewMode === "grid");
  const [detailGroup, setDetailGroup] =
    React.useState<PlaybackClipGroup | null>(null);
  const timelineOpacity = React.useRef(
    new Animated.Value(viewMode === "timeline" ? 1 : 0),
  ).current;
  const gridOpacity = React.useRef(
    new Animated.Value(viewMode === "grid" ? 1 : 0),
  ).current;

  React.useEffect(() => {
    if (viewMode === "grid") setHasOpenedGrid(true);

    const animation = Animated.parallel([
      Animated.timing(timelineOpacity, {
        toValue: viewMode === "timeline" ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(gridOpacity, {
        toValue: viewMode === "grid" ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]);
    animation.start();

    return () => animation.stop();
  }, [gridOpacity, timelineOpacity, viewMode]);

  const rowHeight = Math.round(TIMELINE_ROW_HEIGHT * scale);
  const openedGroup =
    groups.find((group) => group.id === openedGroupId) ?? null;

  React.useEffect(() => {
    if (openedGroup) setDetailGroup(openedGroup);
  }, [openedGroup]);

  if (groups.length === 0 && isLoading) {
    return (
      <View style={styles.timelineLoading}>
        <IsLoading size="small" />
        <Text style={styles.timelineLoadingText}>
          Đang tải bản ghi...
        </Text>
      </View>
    );
  }

  if (groups.length === 0 && errorMessage) {
    return (
      <View style={styles.timelineEmpty}>
        <EmptyState
          iconName="cloud-offline-outline"
          title="Không thể tải bản ghi"
          subtitle={errorMessage}
          fullHeight={false}
        />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={styles.timelineEmpty}>
        <EmptyState
          iconName="videocam-off-outline"
          title="Không có bản ghi"
          subtitle={emptySubtitle}
          fullHeight={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.playbackViews}>
      <Animated.View
        pointerEvents={viewMode === "timeline" ? "auto" : "none"}
        style={[
          styles.timeline,
          viewMode === "timeline"
            ? styles.playbackViewActive
            : styles.playbackViewHidden,
          { opacity: timelineOpacity },
        ]}
      >
        {groups.map((group, index) => (
          <TimelineRow
            key={group.id}
            activeGroupId={activeGroupId}
            group={group}
            onOpenGroup={onOpenGroup}
            playheadOffset={getPlayheadOffset(groups, index, playheadSec)}
            rowHeight={rowHeight}
          />
        ))}

        {/* Rail chạy tiếp qua vùng chừa cuộn: mắt thấy timeline còn tiếp, không
            bị hiểu là đã hết nội dung khi kéo xuống mốc sớm nhất. */}
        {railTailHeight > 0 ? (
          <View
            style={[styles.timelineRow, { height: railTailHeight }]}
            pointerEvents="none"
          >
            <View style={styles.timelineLabelCol} />
            <View style={styles.timelineRailCol} />
          </View>
        ) : null}
      </Animated.View>

      {hasOpenedGrid ? (
        <Animated.View
          pointerEvents={viewMode === "grid" ? "auto" : "none"}
          style={[
            styles.playbackGrid,
            viewMode === "grid"
              ? styles.playbackViewActive
              : styles.playbackViewHidden,
            { opacity: gridOpacity },
          ]}
        >
          {groups.map((group) => (
            <ClipGridGroup
              key={group.id}
              activeClipId={activeClipId}
              group={group}
              onSelectGroup={onSelectGroup}
            />
          ))}
        </Animated.View>
      ) : null}

      <BottomSheetModalShell
        visible={Boolean(openedGroup)}
        onClose={onCloseGroup}
        closeOnBackdropPress
        sheetStyle={[styles.playbackGroupSheet, { height: groupSheetHeight }]}
        statusBarTranslucent
      >
        {detailGroup ? (
          <View style={styles.playbackGroupDetail}>
            <View style={styles.playbackGroupHeader}>
              <TouchableOpacity
                style={styles.playbackGroupCloseBtn}
                onPress={onCloseGroup}
                accessibilityLabel="Đóng danh sách clip"
              >
                <Ionicons name="close" size={28} color={c.text} />
              </TouchableOpacity>
              <Text style={styles.playbackGroupTitle}>
                Tổng cộng {detailGroup.clipCount} clip
              </Text>
            </View>
            <FlatList
              style={styles.playbackGroupScroll}
              contentContainerStyle={styles.playbackGrid}
              columnWrapperStyle={styles.playbackGridRow}
              data={detailGroup.clips}
              keyExtractor={(clip) => clip.id}
              numColumns={3}
              initialNumToRender={9}
              maxToRenderPerBatch={9}
              windowSize={5}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <ClipCard
                  activeClipId={activeClipId}
                  clip={item}
                  group={detailGroup}
                  onSelectGroup={onSelectGroup}
                />
              )}
            />
          </View>
        ) : null}
      </BottomSheetModalShell>
    </View>
  );
}

export default React.memo(PlaybackTimeline);
