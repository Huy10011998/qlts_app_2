import React from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import EmptyState from "../../components/ui/EmptyState";
import SearchBar from "../../components/ui/SearchBar";
import HeaderSearchReveal from "../../components/ui/HeaderSearchReveal";
import SkeletonBlock from "../../components/ui/SkeletonBlock";
import { useSkeletonPulse } from "../../components/ui/useSkeletonAutoFill";
import { useHeaderSearch } from "../../hooks/useHeaderSearch";
import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useSeparatorColor,
  useStyles,
  useThemeValue,
} from "../../utils/helpers/colors";
import { scaledLineHeight } from "../../utils/helpers/textScaling";
import ShareholdersMeetingSkeleton from "./shared/ShareholdersMeetingSkeleton";
import ShareholderAttendanceRow from "./shared/ShareholderAttendanceRow";
import OpinionPickerModal from "./shared/OpinionPickerModal";
import MeetingHeroCard from "./shared/MeetingHeroCard";
import { makeVotingOptions } from "./shared/shareholdersMeetingHelpers";
import type { VotingChoice } from "./shared/shareholdersMeetingHelpers";
import type { AttendanceFilter } from "../../types/index";
import { useShareholdersMeetingController } from "./shared/useShareholdersMeetingController";
import { useColorScheme } from "../../hooks/useColorScheme";

/**
 * Khung chờ phần thân thẻ "Nội dung biểu quyết" lúc đang tải lại danh sách ý
 * kiến: mã, tên hai dòng, dòng chân thẻ — cùng chỗ với nội dung thật.
 */
function OpinionSelectorSkeleton() {
  const voteStyles = useStyles(makeVoteStyles);
  const opacity = useSkeletonPulse();

  return (
    <View accessibilityLabel="Đang tải ý kiến">
      <SkeletonBlock opacity={opacity} style={voteStyles.opinionCodeSkeleton} />
      <SkeletonBlock
        opacity={opacity}
        style={voteStyles.opinionTitleSkeleton}
      />
      <SkeletonBlock
        opacity={opacity}
        style={[
          voteStyles.opinionTitleSkeleton,
          voteStyles.opinionTitleSkeletonShort,
        ]}
      />
      <View style={voteStyles.opinionFoot}>
        <SkeletonBlock
          opacity={opacity}
          style={voteStyles.opinionFootSkeleton}
        />
      </View>
    </View>
  );
}

/** Ba nút lọc dạng viên dưới thẻ tổng quan tab Điểm danh. */
const ATTENDANCE_FILTERS: { key: AttendanceFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "presentOrProxy", label: "Đã có mặt" },
  { key: "pending", label: "Chưa" },
];

/**
 * Nhãn ô phân loại ngắt dòng sẵn: ô chỉ rộng một phần ba thẻ, để chữ tự ngắt
 * thì ra "Không tán / thành".
 */
const VOTING_TILE_LABELS: Record<VotingChoice, string> = {
  agree: "Tán thành",
  disagree: "Không\ntán thành",
  noOpinion: "Không có\ný kiến",
};

const VOTING_TILE_ICONS: Record<VotingChoice, string> = {
  agree: "thumb-up",
  disagree: "thumb-down",
  noOpinion: "minus",
};

/**
 * Một tab gạch chân ngay dưới header: đang chọn thì chữ đậm màu chữ chính + gạch
 * đỏ, số đếm nằm trong viên nhỏ cạnh tên tab.
 */
function MeetingTab({
  active,
  count,
  label,
  onPress,
}: {
  active: boolean;
  count: string;
  label: string;
  onPress: () => void;
}) {
  const styles = useStyles(makeStyles);

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
      <View style={[styles.tabPill, active && styles.tabPillActive]}>
        <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

type StepState = "done" | "current" | "idle";

/**
 * Thanh ba bước đầu tab Lấy ý kiến: Nội dung → Phân loại → Quét QR. Bước xong
 * thì chấm xanh có ✓, bước đang tới thì chấm đỏ có quầng, để người ghi biết còn
 * thiếu gì trước khi quét.
 */
function VotingSteps({
  hasChoice,
  hasOpinion,
}: {
  hasChoice: boolean;
  hasOpinion: boolean;
}) {
  const voteStyles = useStyles(makeVoteStyles);
  const c = useAppColors();
  const steps: { label: string; state: StepState }[] = [
    { label: "Nội dung", state: hasOpinion ? "done" : "current" },
    {
      label: "Phân loại",
      state: hasChoice ? "done" : hasOpinion ? "current" : "idle",
    },
    { label: "Quét QR", state: hasOpinion && hasChoice ? "current" : "idle" },
  ];

  return (
    <View style={voteStyles.steps}>
      {steps.map((step, index) => (
        <React.Fragment key={step.label}>
          {index > 0 ? (
            <View
              style={[
                voteStyles.stepLine,
                steps[index - 1].state === "done" && voteStyles.stepLineDone,
              ]}
            />
          ) : null}
          <View style={voteStyles.step}>
            <View
              style={[
                voteStyles.stepHalo,
                step.state === "current" && voteStyles.stepHaloCurrent,
              ]}
            >
              <View
                style={[
                  voteStyles.stepDot,
                  step.state === "done" && voteStyles.stepDotDone,
                  step.state === "current" && voteStyles.stepDotCurrent,
                ]}
              >
                {step.state === "done" ? (
                  <MaterialCommunityIcons
                    name="check"
                    size={14}
                    color={c.surface}
                  />
                ) : (
                  <Text
                    style={[
                      voteStyles.stepNum,
                      step.state === "current" && voteStyles.stepNumCurrent,
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
            </View>
            <Text
              numberOfLines={1}
              style={[
                voteStyles.stepLabel,
                step.state === "done" && voteStyles.stepLabelDone,
                step.state === "current" && voteStyles.stepLabelCurrent,
              ]}
            >
              {step.label}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const ShareholdersMeetingScreen: React.FC = () => {
  const styles = useStyles(makeStyles);
  const attStyles = useStyles(makeAttStyles);
  const voteStyles = useStyles(makeVoteStyles);
  const c = useAppColors();
  const votingOptions = useThemeValue(makeVotingOptions);
  const isDark = useColorScheme() === "dark";
  const hairlineBorderColor = useHairlineBorderColor();
  const separatorColor = useSeparatorColor();
  const {
    activeMeeting,
    activeTab,
    attendanceFilter,
    attendanceSummary,
    canDiemDanh,
    canGhiYKien,
    canHuyDiemDanh,
    canViewAttendance,
    canViewVoting,
    filteredOpinions,
    filteredShareholders,
    handleCheckIn,
    handleUndoCheckIn,
    hasAnyViewPermission,
    isMeetingLoading,
    isMeetingLocked,
    isOpinionModalVisible,
    isRefreshingAttendance,
    isSearching,
    isVotingLoading,
    loadMeetingData,
    loaded,
    meetingError,
    openScanner,
    opinionSearchQuery,
    opinions,
    refreshAttendanceList,
    searchQuery,
    selectedOpinion,
    selectedOpinionId,
    selectedVotingChoice,
    setActiveTab,
    setAttendanceFilter,
    setIsOpinionModalVisible,
    setOpinionSearchQuery,
    setSearchQuery,
    setSelectedOpinionId,
    setSelectedVotingChoice,
    shareholders,
    submittingAttendanceId,
    votingError,
  } = useShareholdersMeetingController();
  // Ô tìm cổ đông ẩn sau nút kính lúp trên header như các màn danh sách khác;
  // chỉ tab Điểm danh có ô tìm. Phải gọi trước các nhánh return sớm bên dưới.
  const headerSearch = useHeaderSearch({
    query: searchQuery,
    onClear: () => setSearchQuery(""),
    enabled: activeTab === "attendance" && canViewAttendance,
  });

  if (!loaded) {
    return <ShareholdersMeetingSkeleton />;
  }

  if (!hasAnyViewPermission) {
    return (
      <SafeAreaView style={styles.centerState} edges={["left", "right"]}>
        <EmptyState
          iconName="shield-outline"
          title="Bạn không có quyền truy cập"
          subtitle="Tài khoản hiện tại không có quyền xem điểm danh hoặc lấy ý kiến cổ đông."
        />
      </SafeAreaView>
    );
  }

  if (isMeetingLoading) {
    return <ShareholdersMeetingSkeleton />;
  }

  if (meetingError) {
    return (
      <SafeAreaView style={styles.centerState} edges={["left", "right"]}>
        <EmptyState
          iconName="alert-circle-outline"
          title="Không tải được dữ liệu"
          subtitle={meetingError}
          actionLabel="Thử lại"
          onActionPress={() => loadMeetingData()}
        />
      </SafeAreaView>
    );
  }

  if (!activeMeeting) {
    return (
      <SafeAreaView style={styles.centerState} edges={["left", "right"]}>
        <EmptyState
          iconName="people-outline"
          title="Chưa có đợt đại hội cổ đông"
          subtitle="Hiện tại chưa có dữ liệu đại hội cổ đông đang hoạt động."
        />
      </SafeAreaView>
    );
  }

  const { pendingCount, presentCount } = attendanceSummary;
  const selectedOpinionIndex = selectedOpinion
    ? opinions.findIndex((item) => item.id === selectedOpinion.id)
    : -1;
  const selectedChoiceOption = votingOptions.find(
    (option) => option.key === selectedVotingChoice,
  );
  const isReadyToScan =
    Boolean(selectedOpinion) &&
    Boolean(selectedChoiceOption) &&
    !isMeetingLocked;
  const openOpinionPicker = () => setIsOpinionModalVisible(true);

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={c.bg}
      />

      <View style={[styles.tabBar, { borderBottomColor: separatorColor }]}>
        {canViewAttendance && (
          <MeetingTab
            active={activeTab === "attendance"}
            count={`${presentCount}/${shareholders.length}`}
            label="Điểm danh"
            onPress={() => setActiveTab("attendance")}
          />
        )}
        {canViewVoting && (
          <MeetingTab
            active={activeTab === "voting"}
            count={String(opinions.length)}
            label="Lấy ý kiến"
            onPress={() => setActiveTab("voting")}
          />
        )}
      </View>

      {activeTab === "attendance" && canViewAttendance ? (
        <View style={styles.content}>
          <MeetingHeroCard
            {...attendanceSummary}
            totalCount={shareholders.length}
          />

          <View style={attStyles.filterRow}>
            {ATTENDANCE_FILTERS.map((filter) => {
              const isActive = attendanceFilter === filter.key;
              const count =
                filter.key === "all"
                  ? shareholders.length
                  : filter.key === "pending"
                    ? pendingCount
                    : presentCount;

              return (
                <TouchableOpacity
                  key={filter.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  activeOpacity={0.85}
                  onPress={() => setAttendanceFilter(filter.key)}
                  style={[
                    attStyles.filterChip,
                    isActive && attStyles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      attStyles.filterText,
                      isActive && attStyles.filterTextActive,
                    ]}
                  >
                    {filter.label} · {count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <HeaderSearchReveal open={headerSearch.open}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm theo tên hoặc mã cổ đông..."
              isSearching={isSearching}
              style={attStyles.searchSpacing}
              autoFocus
              onClose={headerSearch.close}
            />
          </HeaderSearchReveal>

          <FlatList
            style={attStyles.flatList}
            data={filteredShareholders}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ShareholderAttendanceRow
                item={item}
                onCheckIn={handleCheckIn}
                onUndoCheckIn={handleUndoCheckIn}
                isSubmitting={submittingAttendanceId === item.id}
                canCheckIn={canDiemDanh}
                canUndoCheckIn={canHuyDiemDanh}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshingAttendance}
                onRefresh={refreshAttendanceList}
                colors={[c.red]}
                tintColor={c.red}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              attStyles.list,
              filteredShareholders.length === 0 && attStyles.listEmpty,
            ]}
            ListEmptyComponent={
              <EmptyState
                iconName="people-outline"
                title="Không có cổ đông phù hợp"
                subtitle="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc hiện tại."
              />
            }
          />
        </View>
      ) : isVotingLoading && opinions.length === 0 ? (
        <ShareholdersMeetingSkeleton variant="voting" withHeader={false} />
      ) : (
        <>
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            <VotingSteps
              hasOpinion={Boolean(selectedOpinion)}
              hasChoice={Boolean(selectedChoiceOption)}
            />

            <View
              style={[voteStyles.card, { borderColor: hairlineBorderColor }]}
            >
              <View style={voteStyles.cardHeader}>
                <Text style={voteStyles.sectionLabel}>Nội dung biểu quyết</Text>
                {!isVotingLoading && opinions.length > 0 ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Đổi nội dung biểu quyết"
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
                    onPress={openOpinionPicker}
                    style={voteStyles.headerLink}
                  >
                    <MaterialCommunityIcons
                      name="swap-horizontal"
                      size={17}
                      color={c.red}
                    />
                    <Text style={voteStyles.headerLinkText}>Đổi</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {isVotingLoading ? (
                <OpinionSelectorSkeleton />
              ) : opinions.length === 0 ? (
                <EmptyState
                  iconName={
                    votingError
                      ? "alert-circle-outline"
                      : "chatbox-ellipses-outline"
                  }
                  title={
                    votingError
                      ? "Không tải được danh sách ý kiến"
                      : "Chưa có ý kiến biểu quyết"
                  }
                  subtitle={
                    votingError || "Chưa có ý kiến nào cho đợt đại hội này."
                  }
                />
              ) : selectedOpinion ? (
                <>
                  {selectedOpinion.code ? (
                    <View style={voteStyles.opinionCode}>
                      <Text style={voteStyles.opinionCodeText}>
                        {selectedOpinion.code}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={voteStyles.opinionTitle}>
                    {selectedOpinion.title}
                  </Text>
                  {selectedOpinion.description ? (
                    <Text style={voteStyles.opinionDesc} numberOfLines={4}>
                      {selectedOpinion.description}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Xem tất cả nội dung biểu quyết"
                    activeOpacity={0.7}
                    onPress={openOpinionPicker}
                    style={voteStyles.opinionFoot}
                  >
                    <Text style={voteStyles.opinionFootText}>
                      Nội dung {selectedOpinionIndex + 1} / {opinions.length}
                    </Text>
                    <View style={voteStyles.opinionFootLink}>
                      <Text style={voteStyles.opinionFootText}>Xem tất cả</Text>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={17}
                        color={c.textSub}
                      />
                    </View>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.85}
                  onPress={openOpinionPicker}
                  style={[
                    voteStyles.opinionPlaceholder,
                    { borderColor: separatorColor },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="format-list-bulleted-square"
                    size={20}
                    color={c.red}
                  />
                  <Text style={voteStyles.opinionPlaceholderText}>
                    Chọn nội dung cần lấy ý kiến
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={c.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View
              style={[voteStyles.card, { borderColor: hairlineBorderColor }]}
            >
              <Text
                style={[voteStyles.sectionLabel, voteStyles.sectionLabelSpaced]}
              >
                Phân loại ý kiến
              </Text>
              <View style={voteStyles.tiles}>
                {votingOptions.map((option) => {
                  const isSelected = selectedVotingChoice === option.key;

                  return (
                    <TouchableOpacity
                      key={option.key}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={option.label}
                      accessibilityHint={option.description}
                      activeOpacity={0.85}
                      onPress={() => setSelectedVotingChoice(option.key)}
                      style={[
                        voteStyles.tile,
                        {
                          backgroundColor: isSelected ? option.bg : c.surface,
                          borderColor: isSelected
                            ? option.color
                            : separatorColor,
                        },
                      ]}
                    >
                      {isSelected ? (
                        <View
                          style={[
                            voteStyles.tileTick,
                            { backgroundColor: option.color },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="check"
                            size={13}
                            color={c.surface}
                          />
                        </View>
                      ) : null}
                      <View
                        style={[
                          voteStyles.tileIcon,
                          {
                            // Nền xám nhạt của "Không có ý kiến" gần trùng thẻ
                            // trắng, nên vòng icon của nó dùng nền phụ.
                            backgroundColor: isSelected
                              ? option.color
                              : option.key === "noOpinion"
                                ? c.surfaceAlt
                                : option.bg,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={VOTING_TILE_ICONS[option.key]}
                          size={24}
                          color={isSelected ? c.surface : option.color}
                        />
                      </View>
                      <Text
                        style={[
                          voteStyles.tileLabel,
                          isSelected && { color: option.color },
                        ]}
                      >
                        {VOTING_TILE_LABELS[option.key]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={voteStyles.bottomSpacer} />
          </ScrollView>

          {/* Thanh quét dính đáy màn, luôn thấy dù cuộn tới đâu. Chưa đủ điều
              kiện thì nút mờ nhưng vẫn bấm được: `openScanner` báo đúng thứ
              còn thiếu. Đệm đáy lấy số lớn hơn giữa vùng an toàn và 12. */}
          {canGhiYKien ? (
            <SafeAreaView
              edges={{ bottom: "maximum" }}
              style={[voteStyles.scanBar, { borderTopColor: separatorColor }]}
            >
              <Text style={voteStyles.scanCaption} numberOfLines={1}>
                {isMeetingLocked ? (
                  "Đại hội đã khóa, chỉ xem được thông tin."
                ) : !selectedOpinion ? (
                  "Chọn nội dung biểu quyết trước khi quét."
                ) : !selectedChoiceOption ? (
                  "Chọn phân loại ý kiến trước khi quét."
                ) : (
                  <>
                    {"Sẽ ghi "}
                    <Text
                      style={[
                        voteStyles.scanCaptionStrong,
                        { color: selectedChoiceOption.color },
                      ]}
                    >
                      {selectedChoiceOption.label}
                    </Text>
                    {` cho ${selectedOpinion.code || selectedOpinion.title}`}
                  </>
                )}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Quét QR ghi ý kiến"
                activeOpacity={0.85}
                onPress={openScanner}
                style={[
                  voteStyles.scanButton,
                  !isReadyToScan && voteStyles.scanButtonIdle,
                ]}
              >
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={22}
                  color="#FFFFFF"
                />
                <Text style={voteStyles.scanButtonText}>
                  Quét QR ghi ý kiến
                </Text>
              </TouchableOpacity>
            </SafeAreaView>
          ) : null}
        </>
      )}

      <OpinionPickerModal
        visible={isOpinionModalVisible}
        opinions={filteredOpinions}
        selectedOpinionId={selectedOpinionId}
        searchQuery={opinionSearchQuery}
        onChangeSearchQuery={setOpinionSearchQuery}
        onClose={() => setIsOpinionModalVisible(false)}
        onSelect={(id) => {
          setSelectedOpinionId(id);
          setIsOpinionModalVisible(false);
        }}
      />
    </SafeAreaView>
  );
};

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    centerState: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    tabBar: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingTop: 13,
      paddingBottom: 11,
      borderBottomWidth: 2.5,
      borderBottomColor: "transparent",
    },
    tabActive: { borderBottomColor: c.red },
    tabLabel: { color: c.textSub, fontSize: 14, fontWeight: "600" },
    tabLabelActive: { color: c.textPrimary },
    tabPill: {
      paddingHorizontal: 7,
      paddingVertical: 1,
      borderRadius: 999,
      backgroundColor: c.surfaceAlt,
    },
    tabPillActive: { backgroundColor: c.redSurface },
    tabPillText: { color: c.textSub, fontSize: 11, fontWeight: "700" },
    tabPillTextActive: { color: c.red },
    content: { flex: 1, paddingTop: 14, backgroundColor: c.bg },
  });

const makeAttStyles = (c: AppColors) =>
  StyleSheet.create({
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.slateBorder,
      backgroundColor: c.surface,
    },
    filterChipActive: { borderColor: c.red, backgroundColor: c.red },
    filterText: { color: c.textSecondary, fontSize: 12.5, fontWeight: "600" },
    filterTextActive: { color: "#FFFFFF" },
    searchSpacing: {
      marginHorizontal: 16,
      marginBottom: 12,
    },
    flatList: { flex: 1, backgroundColor: c.bg },
    list: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 20 },
    listEmpty: { paddingTop: 0, paddingBottom: 0 },
  });

const makeVoteStyles = (c: AppColors) =>
  StyleSheet.create({
    steps: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 16,
      marginBottom: 10,
    },
    step: { flexDirection: "row", alignItems: "center", gap: 4 },
    // Quầng của bước đang tới vẽ bằng khung 28 bọc chấm 22: RN không có
    // spread cho bóng như box-shadow.
    stepHalo: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    stepHaloCurrent: { backgroundColor: c.redSurface },
    // Bước chưa tới: chấm trắng viền đậm — nền phụ trùng màu nền trang nên
    // chấm xám đặc nằm trên nền là tàng hình.
    stepDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: c.borderStrong,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
    },
    stepDotDone: { backgroundColor: c.green, borderColor: c.green },
    stepDotCurrent: { backgroundColor: c.red, borderColor: c.red },
    stepNum: { color: c.textSub, fontSize: 12, fontWeight: "700" },
    stepNumCurrent: { color: "#FFFFFF" },
    stepLabel: { color: c.textSub, fontSize: 12.5, fontWeight: "700" },
    stepLabelDone: { color: c.textPrimary },
    stepLabelCurrent: { color: c.red },
    stepLine: {
      flex: 1,
      height: 2,
      minWidth: 12,
      marginHorizontal: 6,
      borderRadius: 1,
      backgroundColor: c.borderStrong,
    },
    stepLineDone: { backgroundColor: c.green },
    card: {
      backgroundColor: c.surface,
      marginHorizontal: 16,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 10,
    },
    sectionLabel: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    sectionLabelSpaced: { marginBottom: 12 },
    headerLink: { flexDirection: "row", alignItems: "center", gap: 3 },
    headerLinkText: { color: c.red, fontSize: 13.5, fontWeight: "700" },
    opinionCode: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginBottom: 6,
      borderRadius: 7,
      backgroundColor: c.redSurface,
    },
    opinionCodeText: {
      color: c.red,
      fontSize: 11.5,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
    opinionTitle: {
      color: c.textPrimary,
      fontSize: 16.5,
      fontWeight: "700",
      lineHeight: scaledLineHeight(16.5, 1.32),
    },
    opinionDesc: {
      color: c.textSecondary,
      fontSize: 13.5,
      lineHeight: scaledLineHeight(13.5, 1.42),
      marginTop: 4,
    },
    opinionFoot: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: c.separator,
    },
    opinionFootLink: { flexDirection: "row", alignItems: "center" },
    opinionFootText: { color: c.textSub, fontSize: 12.5, fontWeight: "600" },
    opinionPlaceholder: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: 56,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
    },
    opinionPlaceholderText: {
      flex: 1,
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    opinionCodeSkeleton: {
      width: 52,
      height: 20,
      borderRadius: 7,
      marginBottom: 8,
    },
    opinionTitleSkeleton: {
      width: "88%",
      height: 15,
      borderRadius: 7,
      marginBottom: 8,
    },
    opinionTitleSkeletonShort: { width: "52%" },
    opinionFootSkeleton: { width: 96, height: 11, borderRadius: 5 },
    tiles: { flexDirection: "row", gap: 8 },
    tile: {
      flex: 1,
      alignItems: "center",
      paddingTop: 14,
      paddingBottom: 12,
      paddingHorizontal: 4,
      borderRadius: 16,
      borderWidth: 1.5,
    },
    tileTick: {
      position: "absolute",
      top: 7,
      right: 7,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    tileIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    tileLabel: {
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: "700",
      textAlign: "center",
    },
    scanBar: {
      paddingTop: 10,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderTopWidth: 1,
      backgroundColor: c.surface,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 8,
    },
    scanButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      minHeight: 54,
      borderRadius: 16,
      backgroundColor: c.red,
      shadowColor: c.red,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 4,
    },
    scanButtonIdle: { opacity: 0.5 },
    scanButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
    scanCaption: {
      color: c.textSub,
      fontSize: 12.5,
      textAlign: "center",
      marginBottom: 8,
      marginHorizontal: 8,
    },
    scanCaptionStrong: { fontWeight: "700" },
    bottomSpacer: {
      height: 16,
    },
  });

export default ShareholdersMeetingScreen;
