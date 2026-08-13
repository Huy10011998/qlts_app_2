import React from "react";
import {
  ActivityIndicator,
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
import {
  AppColors,
  useAccentBorderColors,
  useAppColors,
  useHairlineBorderColor,
  useSeparatorColor,
  useStrongBorderColor,
  useStyles,
  useThemeValue,
} from "../../utils/helpers/colors";
import ShareholderAttendanceRow from "./shared/ShareholderAttendanceRow";
import OpinionPickerModal from "./shared/OpinionPickerModal";
import { makeVotingOptions } from "./shared/shareholdersMeetingHelpers";
import { useShareholdersMeetingController } from "./shared/useShareholdersMeetingController";
import { useColorScheme } from "../../hooks/useColorScheme";

function AttendanceSeparator() {
  const attStyles = useStyles(makeAttStyles);
  return <View style={attStyles.separator} />;
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
  const strongBorderColor = useStrongBorderColor();
  const accentBorders = useAccentBorderColors();
  const votingChoiceBorders = {
    agree: accentBorders.green,
    disagree: accentBorders.red,
    noOpinion: accentBorders.slate,
  } as const;
  const {
    activeMeeting,
    activeTab,
    attendanceFilter,
    attendanceRate,
    canDiemDanh,
    canHuyDiemDanh,
    canViewAttendance,
    canViewVoting,
    filteredOpinions,
    filteredShareholders,
    handleCheckIn,
    handleUndoCheckIn,
    hasAnyViewPermission,
    isMeetingLoading,
    isOpinionModalVisible,
    isRefreshingAttendance,
    isSearching,
    isVotingLoading,
    loaded,
    meetingError,
    opinionSearchQuery,
    opinions,
    pendingCount,
    presentCount,
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

  if (!loaded) {
    return (
      <SafeAreaView style={styles.centerState} edges={["left", "right"]}>
        <ActivityIndicator size="small" color={c.red} />
      </SafeAreaView>
    );
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
    return (
      <SafeAreaView style={styles.centerState} edges={["left", "right"]}>
        <ActivityIndicator size="small" color={c.red} />
      </SafeAreaView>
    );
  }

  if (meetingError) {
    return (
      <SafeAreaView style={styles.centerState} edges={["left", "right"]}>
        <EmptyState
          iconName="alert-circle-outline"
          title="Không tải được dữ liệu"
          subtitle={meetingError}
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

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "#09111B" : "#F0F2F8"}
      />

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>
          {activeMeeting.ten || "Đại hội cổ đông"}
        </Text>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: separatorColor }]}>
        {canViewAttendance && (
          <TouchableOpacity
            style={[styles.tab, activeTab === "attendance" && styles.tabActive]}
            onPress={() => setActiveTab("attendance")}
          >
            <Text style={styles.tabIcon}>☑️</Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === "attendance" && styles.tabLabelActive,
              ]}
            >
              Điểm danh
            </Text>
            <View
              style={[
                styles.tabBadge,
                {
                  backgroundColor:
                    activeTab === "attendance" ? c.accent : c.surfaceAlt,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === "attendance"
                    ? styles.tabBadgeTextActive
                    : styles.tabBadgeTextInactive,
                ]}
              >
                {presentCount}/{shareholders.length}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {canViewVoting && (
          <TouchableOpacity
            style={[styles.tab, activeTab === "voting" && styles.tabActive]}
            onPress={() => setActiveTab("voting")}
          >
            <Text style={styles.tabIcon}>🗳️</Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === "voting" && styles.tabLabelActive,
              ]}
            >
              Lấy ý kiến
            </Text>
            <View
              style={[
                styles.tabBadge,
                {
                  backgroundColor:
                    activeTab === "voting" ? c.accent : c.surfaceAlt,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === "voting"
                    ? styles.tabBadgeTextActive
                    : styles.tabBadgeTextInactive,
                ]}
              >
                {opinions.length}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {activeTab === "attendance" && canViewAttendance ? (
        <View style={styles.content}>
          <Text style={attStyles.helperText}>
            Tỷ lệ tham dự hiện tại: {attendanceRate}%
          </Text>
          <View style={attStyles.summaryRow}>
            <TouchableOpacity
              style={[
                attStyles.summaryCard,
                { borderColor: hairlineBorderColor },
                attendanceFilter === "all" && attStyles.summaryCardActive,
              ]}
              activeOpacity={0.9}
              onPress={() => setAttendanceFilter("all")}
            >
              <Text
                style={[
                  attStyles.summaryNum,
                  attendanceFilter === "all" && attStyles.summaryNumActive,
                ]}
              >
                {shareholders.length}
              </Text>
              <Text style={attStyles.summaryLabel}>Tất cả</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                attStyles.summaryCard,
                { borderColor: hairlineBorderColor },
                attendanceFilter === "presentOrProxy" &&
                  attStyles.summaryCardActive,
              ]}
              activeOpacity={0.9}
              onPress={() => setAttendanceFilter("presentOrProxy")}
            >
              <Text
                style={[
                  attStyles.summaryNum,
                  attendanceFilter === "presentOrProxy" &&
                    attStyles.summaryNumActive,
                ]}
              >
                {presentCount}
              </Text>
              <Text style={attStyles.summaryLabel}>Đã điểm danh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                attStyles.summaryCard,
                { borderColor: hairlineBorderColor },
                attendanceFilter === "pending" && attStyles.summaryCardActive,
              ]}
              activeOpacity={0.9}
              onPress={() => setAttendanceFilter("pending")}
            >
              <Text
                style={[
                  attStyles.summaryNum,
                  attendanceFilter === "pending" && attStyles.summaryNumActive,
                ]}
              >
                {pendingCount}
              </Text>
              <Text style={attStyles.summaryLabel}>Chưa điểm danh</Text>
            </TouchableOpacity>
          </View>

          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm theo tên hoặc mã cổ đông..."
            isSearching={isSearching}
            style={attStyles.searchSpacing}
          />

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
            ItemSeparatorComponent={AttendanceSeparator}
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
        <View style={styles.contentCenter}>
          <ActivityIndicator size="small" color={c.red} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <View style={voteStyles.summaryRow}>
            <View
              style={[
                voteStyles.summaryCard,
                { borderColor: hairlineBorderColor },
              ]}
            >
              <Text style={voteStyles.summaryNum}>{opinions.length}</Text>
              <Text style={voteStyles.summaryLabel}>Ý kiến</Text>
            </View>
            <View
              style={[
                voteStyles.summaryCard,
                { borderColor: hairlineBorderColor },
              ]}
            >
              <Text style={voteStyles.summaryNum}>
                {selectedOpinion ? 1 : 0}
              </Text>
              <Text style={voteStyles.summaryLabel}>Đã chọn</Text>
            </View>
          </View>

          <View style={[voteStyles.card, { borderColor: hairlineBorderColor }]}>
            <Text style={voteStyles.sectionLabel}>Ý kiến cần lấy</Text>
            <View
              style={[
                voteStyles.opinionSelector,
                { borderColor: hairlineBorderColor },
              ]}
            >
              {isVotingLoading ? (
                <View style={voteStyles.loadingWrap}>
                  <ActivityIndicator size="small" color={c.red} />
                  <Text style={voteStyles.loadingText}>Đang tải ý kiến...</Text>
                </View>
              ) : opinions.length > 0 ? (
                <>
                  <View style={voteStyles.opinionSelectorHeader}>
                    <Text style={voteStyles.opinionSelectorLabel}>
                      Mở danh sách để chọn đúng ý kiến cần ghi nhận
                    </Text>
                    <View
                      style={[
                        voteStyles.opinionSelectorCount,
                        { borderColor: hairlineBorderColor },
                      ]}
                    >
                      <Text style={voteStyles.opinionSelectorCountText}>
                        {opinions.length} mục
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      voteStyles.opinionPickerButton,
                      { borderColor: hairlineBorderColor },
                    ]}
                    activeOpacity={0.9}
                    onPress={() => setIsOpinionModalVisible(true)}
                  >
                    <View style={voteStyles.opinionPickerButtonLeft}>
                      <MaterialCommunityIcons
                        name="format-list-bulleted-square"
                        size={20}
                        color={c.accent}
                      />
                      <View style={voteStyles.opinionPickerTextWrap}>
                        <Text style={voteStyles.opinionPickerLabel}>
                          {selectedOpinion ? "Đổi ý kiến" : "Chọn ý kiến"}
                        </Text>
                        <Text
                          style={voteStyles.opinionPickerValue}
                          numberOfLines={2}
                        >
                          {selectedOpinion
                            ? selectedOpinion.code
                              ? `${selectedOpinion.code} - ${selectedOpinion.title}`
                              : selectedOpinion.title
                            : "Nhấn để mở danh sách ý kiến"}
                        </Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={22}
                      color={c.textMuted}
                    />
                  </TouchableOpacity>
                </>
              ) : (
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
              )}
            </View>

            {selectedOpinion && (
              <View
                style={[
                  voteStyles.selectedInfoBox,
                  { borderColor: strongBorderColor },
                ]}
              >
                <View style={voteStyles.selectedInfoHeader}>
                  <View
                    style={[
                      voteStyles.selectedInfoBadge,
                      { borderColor: strongBorderColor },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={16}
                      color={c.accent}
                    />
                    <Text style={voteStyles.selectedInfoBadgeText}>
                      Đang chọn
                    </Text>
                  </View>
                </View>
                <Text style={voteStyles.selectedInfoTitle}>
                  {selectedOpinion.code
                    ? `${selectedOpinion.code} - ${selectedOpinion.title}`
                    : selectedOpinion.title}
                </Text>
                {!!selectedOpinion.description && (
                  <Text style={voteStyles.selectedInfoDesc}>
                    {selectedOpinion.description}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={[voteStyles.card, { borderColor: hairlineBorderColor }]}>
            <Text style={voteStyles.sectionLabel}>Phân loại ý kiến</Text>
            <View style={voteStyles.choiceList}>
              {votingOptions.map((option) => {
                const isSelected = selectedVotingChoice === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      voteStyles.choiceCard,
                      {
                        backgroundColor: isSelected ? option.bg : c.surface,
                        borderColor: isSelected
                          ? votingChoiceBorders[option.key]
                          : hairlineBorderColor,
                      },
                    ]}
                    activeOpacity={0.9}
                    onPress={() => setSelectedVotingChoice(option.key)}
                  >
                    <View style={voteStyles.choiceLeft}>
                      <MaterialCommunityIcons
                        name={
                          isSelected
                            ? "checkbox-marked"
                            : "checkbox-blank-outline"
                        }
                        size={22}
                        color={isSelected ? option.color : c.textMuted}
                      />
                      <View style={voteStyles.choiceTextWrap}>
                        <Text
                          style={[
                            voteStyles.choiceTitle,
                            isSelected && { color: option.color },
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text style={voteStyles.choiceDesc}>
                          {option.description}
                        </Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={20}
                      color={option.color}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={voteStyles.bottomSpacer} />
        </ScrollView>
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
    heroCard: {
      backgroundColor: c.accent,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 12,
      borderRadius: 18,
      padding: 16,
    },
    heroTitle: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
      lineHeight: 24,
      textAlign: "center",
    },
    centerState: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    tabBar: {
      flexDirection: "row",
      backgroundColor: c.surface,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.surfaceAlt,
      gap: 6,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    tabActive: {
      borderColor: c.accent,
      backgroundColor: c.accentLight,
    },
    tabIcon: { fontSize: 14 },
    tabLabel: { color: c.textMuted, fontSize: 13, fontWeight: "600" },
    tabLabelActive: { color: c.accent },
    tabBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
    },
    tabBadgeText: { fontSize: 11, fontWeight: "600" },
    tabBadgeTextActive: { color: "#FFFFFF" },
    tabBadgeTextInactive: { color: c.textMuted },
    content: { flex: 1, paddingTop: 12, backgroundColor: c.bg },
    contentCenter: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
    },
  });

const makeAttStyles = (c: AppColors) =>
  StyleSheet.create({
    summaryRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 12,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 10,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    summaryCardActive: {
      borderColor: c.accent,
      backgroundColor: c.accentLight,
    },
    summaryNum: { color: c.textPrimary, fontSize: 20, fontWeight: "700" },
    summaryNumActive: { color: c.accent },
    summaryLabel: {
      color: c.textMuted,
      fontSize: 10,
      marginTop: 2,
      textAlign: "center",
      fontWeight: "600",
    },
    helperText: {
      color: c.textSecondary,
      fontSize: 12,
      marginHorizontal: 16,
      marginBottom: 12,
    },
    searchSpacing: {
      marginHorizontal: 16,
      marginBottom: 12,
    },
    flatList: { flex: 1, backgroundColor: c.bg },
    list: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 20 },
    listEmpty: { paddingTop: 0, paddingBottom: 0 },
    separator: { height: 1, backgroundColor: c.border, marginVertical: 2 },
  });

const makeVoteStyles = (c: AppColors) =>
  StyleSheet.create({
    summaryRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 16,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    summaryNum: { color: c.textPrimary, fontSize: 22, fontWeight: "700" },
    summaryLabel: {
      color: c.textMuted,
      fontSize: 11,
      marginTop: 4,
      fontWeight: "600",
    },
    helperText: {
      color: c.textSecondary,
      fontSize: 12,
      marginHorizontal: 16,
      marginBottom: 12,
    },
    card: {
      backgroundColor: c.surface,
      marginHorizontal: 16,
      borderRadius: 14,
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
    sectionLabel: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 10,
    },
    opinionSelector: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      padding: 12,
    },
    opinionSelectorHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 10,
    },
    opinionSelectorLabel: {
      flex: 1,
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: "600",
    },
    opinionSelectorCount: {
      backgroundColor: c.surface,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    opinionSelectorCountText: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: "700",
    },
    opinionPickerButton: {
      minHeight: 64,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    opinionPickerButtonLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    opinionPickerTextWrap: {
      marginLeft: 10,
      flex: 1,
    },
    opinionPickerLabel: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 4,
    },
    opinionPickerValue: {
      color: c.textPrimary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "600",
    },
    loadingWrap: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 18,
      gap: 8,
    },
    loadingText: {
      color: c.textSecondary,
      fontSize: 13,
    },
    selectedInfoBox: {
      marginTop: 12,
      backgroundColor: c.accentLight,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    selectedInfoHeader: {
      marginBottom: 8,
    },
    selectedInfoBadge: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.surface,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.borderStrong,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    selectedInfoBadgeText: {
      color: c.accent,
      fontSize: 11,
      fontWeight: "700",
    },
    selectedInfoTitle: {
      color: c.accent,
      fontSize: 13,
      fontWeight: "700",
    },
    selectedInfoDesc: {
      color: c.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    choiceList: {
      gap: 10,
    },
    choiceCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    choiceLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    choiceTextWrap: {
      marginLeft: 10,
      flex: 1,
    },
    choiceTitle: {
      color: c.textPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
    choiceDesc: {
      color: c.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 2,
    },
    readyHint: {
      marginTop: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.accentLight,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borderStrong,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    readyHintText: {
      flex: 1,
      color: c.accent,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "600",
    },
    bottomSpacer: {
      height: 28,
    },
  });

export default ShareholdersMeetingScreen;
