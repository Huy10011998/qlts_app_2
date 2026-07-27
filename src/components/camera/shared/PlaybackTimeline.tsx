import React from "react";
import {
  Animated,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import { C } from "../../../utils/helpers/colors";
import EmptyState from "../../ui/EmptyState";
import IsLoading from "../../ui/IconLoading";
import BottomSheetModalShell from "../../shared/BottomSheetModalShell";
import CameraSnapshotThumbnail from "./CameraSnapshotThumbnail";
import {
  formatClock,
  type PlaybackClip,
  type PlaybackClipGroup,
} from "./cameraPlaybackHelpers";
import { styles, TIMELINE_ROW_HEIGHT } from "../CameraPlayback.styles";

type PlaybackTimelineProps = {
  activeClipId: string | null;
  activeGroupId: string | null;
  cameraCode: string;
  cameraId: string | number;
  cameraToken: string;
  emptySubtitle: string;
  errorMessage: string | null;
  groups: PlaybackClipGroup[];
  groupSheetHeight: number;
  onCloseGroup: () => void;
  onOpenGroup: (group: PlaybackClipGroup) => void;
  onSelectGroup: (group: PlaybackClipGroup, clipId?: string) => void;
  openedGroupId: string | null;
  isLoading: boolean;
  /** Hệ số zoom timeline — giãn/thu chiều cao mỗi nhóm. */
  scale: number;
  thumbTimestamp: number;
  viewMode: "timeline" | "grid";
};

const TimelineRow = React.memo(function TimelineRow({
  activeGroupId,
  cameraCode,
  cameraId,
  cameraToken,
  group,
  onOpenGroup,
  rowHeight,
  thumbTimestamp,
}: {
  activeGroupId: string | null;
  cameraCode: string;
  cameraId: string | number;
  cameraToken: string;
  group: PlaybackClipGroup;
  onOpenGroup: (group: PlaybackClipGroup) => void;
  rowHeight: number;
  thumbTimestamp: number;
}) {
  const isActive = group.id === activeGroupId;

  return (
    <View style={[styles.timelineRow, { height: rowHeight }]}>
      {/* Mốc giờ của nhóm. Thời gian đang đọc do badge cố định ngoài vùng
          cuộn hiển thị, nên ở đây luôn là nhãn thường. */}
      <View style={styles.timelineLabelCol}>
        <Text
          style={[styles.timelineLabel, isActive && styles.timelineLabelActive]}
          allowFontScaling={false}
        >
          {`${String(group.hour).padStart(2, "0")}:00`}
        </Text>
        <View style={styles.timelineLabelDash} />
      </View>

      <View style={styles.timelineRailCol}>
        {group.tickOffsets.map((offset, tickIndex) => (
          <View
            key={`${group.id}-tick-${tickIndex}`}
            style={[
              styles.timelineTick,
              isActive && styles.timelineTickActive,
              { top: Math.round(offset * (rowHeight - 6)) },
            ]}
          />
        ))}
      </View>

      <View style={styles.timelineClipCol}>
        <TouchableOpacity
          style={styles.clipCardWrap}
          activeOpacity={0.85}
          onPress={() => onOpenGroup(group)}
          accessibilityLabel={`Phát ${group.clipCount} clip lúc ${formatClock(
            group.startSec,
          )}`}
        >
          <View style={styles.clipCardStack} />
          <View style={[styles.clipCard, isActive && styles.clipCardActive]}>
            {cameraToken ? (
              <CameraSnapshotThumbnail
                cameraCode={cameraCode}
                cameraId={`${cameraId}-${group.id}`}
                cameraToken={cameraToken}
                focusKey={0}
                showLoadingIndicator={false}
                thumbTimestamp={thumbTimestamp}
              />
            ) : null}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.55)"]}
              style={styles.clipCardScrim}
              pointerEvents="none"
            />
            <Text style={styles.clipCountText} allowFontScaling={false}>
              {group.clipCount} clip
            </Text>
            <View style={styles.clipPlayBtn} pointerEvents="none">
              <View style={styles.clipPlayCircle}>
                <Ionicons name="play" size={22} color="#fff" />
              </View>
            </View>
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
  cameraCode,
  cameraId,
  cameraToken,
  clip,
  group,
  onSelectGroup,
  thumbTimestamp,
}: {
  activeClipId: string | null;
  cameraCode: string;
  cameraId: string | number;
  cameraToken: string;
  clip: PlaybackClip;
  group: PlaybackClipGroup;
  onSelectGroup: (group: PlaybackClipGroup, clipId?: string) => void;
  thumbTimestamp: number;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.playbackGridCard,
        clip.id === activeClipId && styles.playbackGridCardActive,
      ]}
      activeOpacity={0.85}
      onPress={() => onSelectGroup(group, clip.id)}
      accessibilityLabel={`Phát bản ghi lúc ${formatClock(clip.startSec)}`}
    >
      {cameraToken ? (
        <CameraSnapshotThumbnail
          cameraCode={cameraCode}
          cameraId={`${cameraId}-${clip.id}`}
          cameraToken={cameraToken}
          focusKey={0}
          showLoadingIndicator={false}
          thumbTimestamp={thumbTimestamp}
        />
      ) : null}
      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "transparent"]}
        style={styles.playbackGridScrim}
        pointerEvents="none"
      />
      <Text style={styles.playbackGridTime} allowFontScaling={false}>
        {formatClock(clip.startSec, false)}
      </Text>
      <Text style={styles.playbackGridDuration} allowFontScaling={false}>
        {`${Math.floor(clip.durationSec / 60)}'${String(
          clip.durationSec % 60
        ).padStart(2, "0")}"`}
      </Text>
      {group.hasPerson ? (
        <View style={styles.playbackGridEventIcon} pointerEvents="none">
          <Ionicons name="body-outline" size={17} color="#fff" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

const ClipGridGroup = React.memo(function ClipGridGroup({
  activeClipId,
  cameraCode,
  cameraId,
  cameraToken,
  group,
  onSelectGroup,
  thumbTimestamp,
}: {
  activeClipId: string | null;
  cameraCode: string;
  cameraId: string | number;
  cameraToken: string;
  group: PlaybackClipGroup;
  onSelectGroup: (group: PlaybackClipGroup, clipId?: string) => void;
  thumbTimestamp: number;
}) {
  return (
    <View style={styles.playbackGridGroup}>
      <View style={styles.playbackGridHourRow}>
        <Text style={styles.playbackGridHour} allowFontScaling={false}>
          {`${String(group.hour).padStart(2, "0")}:00`}
        </Text>
        <View style={styles.playbackGridHourRule} />
        <Text style={styles.playbackGridHourCount} allowFontScaling={false}>
          {`${group.clipCount} clip`}
        </Text>
      </View>
      <View style={styles.playbackGridClips}>
        {group.clips.map((clip) => (
          <ClipCard
            key={clip.id}
            activeClipId={activeClipId}
            cameraCode={cameraCode}
            cameraId={cameraId}
            cameraToken={cameraToken}
            clip={clip}
            group={group}
            onSelectGroup={onSelectGroup}
            thumbTimestamp={thumbTimestamp}
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
  cameraCode,
  cameraId,
  cameraToken,
  emptySubtitle,
  errorMessage,
  groups,
  groupSheetHeight,
  onCloseGroup,
  onOpenGroup,
  onSelectGroup,
  openedGroupId,
  isLoading,
  scale,
  thumbTimestamp,
  viewMode,
}: PlaybackTimelineProps) {
  // Sau lần mở đầu tiên, giữ grid mounted và chỉ ẩn đi khi chuyển về timeline.
  // Nhờ vậy thumbnail không bị tạo lại/tải lại mỗi lần đổi giao diện.
  const [hasOpenedGrid, setHasOpenedGrid] = React.useState(
    viewMode === "grid"
  );
  const [detailGroup, setDetailGroup] =
    React.useState<PlaybackClipGroup | null>(null);
  const timelineOpacity = React.useRef(
    new Animated.Value(viewMode === "timeline" ? 1 : 0)
  ).current;
  const gridOpacity = React.useRef(
    new Animated.Value(viewMode === "grid" ? 1 : 0)
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
        <Text style={styles.timelineLoadingText} allowFontScaling={false}>
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
        {groups.map((group) => (
          <TimelineRow
            key={group.id}
            activeGroupId={activeGroupId}
            cameraCode={cameraCode}
            cameraId={cameraId}
            cameraToken={cameraToken}
            group={group}
            onOpenGroup={onOpenGroup}
            rowHeight={rowHeight}
            thumbTimestamp={thumbTimestamp}
          />
        ))}
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
              cameraCode={cameraCode}
              cameraId={cameraId}
              cameraToken={cameraToken}
              group={group}
              onSelectGroup={onSelectGroup}
              thumbTimestamp={thumbTimestamp}
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
                <Ionicons name="close" size={28} color={C.text} />
              </TouchableOpacity>
              <Text style={styles.playbackGroupTitle} allowFontScaling={false}>
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
                  cameraCode={cameraCode}
                  cameraId={cameraId}
                  cameraToken={cameraToken}
                  clip={item}
                  group={detailGroup}
                  onSelectGroup={onSelectGroup}
                  thumbTimestamp={thumbTimestamp}
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
