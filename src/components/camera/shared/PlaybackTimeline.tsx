import React from "react";
import {
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { C } from "../../../utils/helpers/colors";
import EmptyState from "../../ui/EmptyState";
import BottomSheetModalShell from "../../shared/BottomSheetModalShell";
import CameraSnapshotThumbnail from "./CameraSnapshotThumbnail";
import {
  formatClock,
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
  groups: PlaybackClipGroup[];
  groupSheetHeight: number;
  onCloseGroup: () => void;
  onOpenGroup: (group: PlaybackClipGroup) => void;
  onSelectGroup: (group: PlaybackClipGroup, clipId?: string) => void;
  openedGroupId: string | null;
  /** Hệ số zoom timeline — giãn/thu chiều cao mỗi nhóm. */
  scale: number;
  thumbTimestamp: number;
  viewMode: "timeline" | "grid";
};

function TimelineRow({
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
        <Text style={styles.timelineLabel} allowFontScaling={false}>
          {formatClock(group.startSec, false)}
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
}

function ClipGridGroup({
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
      <Text style={styles.playbackGridHour} allowFontScaling={false}>
        {`${String(Math.floor(group.startSec / 3600)).padStart(2, "0")}:00`}
      </Text>
      <View style={styles.playbackGridClips}>
        {Array.from({ length: group.clipCount }, (_, clipIndex) => {
          const clipTime = Math.max(0, group.startSec - clipIndex * 60);
          const clipId = `${group.id}-clip-${clipIndex}`;

          return (
            <TouchableOpacity
              key={clipId}
              style={[
                styles.playbackGridCard,
                clipId === activeClipId && styles.playbackGridCardActive,
              ]}
              activeOpacity={0.85}
              onPress={() => onSelectGroup(group, clipId)}
              accessibilityLabel={`Phát bản ghi lúc ${formatClock(clipTime)}`}
            >
              {cameraToken ? (
                <CameraSnapshotThumbnail
                  cameraCode={cameraCode}
                  cameraId={`${cameraId}-${group.id}-${clipIndex}`}
                  cameraToken={cameraToken}
                  focusKey={0}
                  showLoadingIndicator={false}
                  thumbTimestamp={thumbTimestamp}
                />
              ) : null}
              <Text style={styles.playbackGridTime} allowFontScaling={false}>
                {formatClock(clipTime, false)}
              </Text>
              <Text style={styles.playbackGridDuration} allowFontScaling={false}>
                0&apos;15&quot;
              </Text>
              {group.hasPerson ? (
                <View
                  style={styles.playbackGridEventIcon}
                  pointerEvents="none"
                >
                  <Ionicons name="body-outline" size={17} color="#fff" />
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function PlaybackTimeline({
  activeClipId,
  activeGroupId,
  cameraCode,
  cameraId,
  cameraToken,
  emptySubtitle,
  groups,
  groupSheetHeight,
  onCloseGroup,
  onOpenGroup,
  onSelectGroup,
  openedGroupId,
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
            <ScrollView
              style={styles.playbackGroupScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.playbackGrid}>
                <ClipGridGroup
                  activeClipId={activeClipId}
                  cameraCode={cameraCode}
                  cameraId={cameraId}
                  cameraToken={cameraToken}
                  group={detailGroup}
                  onSelectGroup={onSelectGroup}
                  thumbTimestamp={thumbTimestamp}
                />
              </View>
            </ScrollView>
          </View>
        ) : null}
      </BottomSheetModalShell>
    </View>
  );
}
