import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { usePermission } from "../../hooks/usePermission";
import { useDebounce } from "../../hooks/useDebounce";
import {
  diemDanhDhcd,
  getActiveDhcd,
  getCodongDhcd,
  getList,
  huyDiemDanhDhcd,
} from "../../services/data/CallApi";
import IsLoading from "../../components/ui/IconLoading";
import { C, getMatchedKey, removeVietnameseTones } from "../../utils/Helper";
import {
  ActiveMeetingResponse,
  AttendanceFilter,
  AttendanceStatus,
  Shareholder,
  ShareholderApiItem,
  ShareholderListResponse,
  ShareholderRowProps,
} from "../../types/Index";

type VotingChoice = "agree" | "disagree" | "noOpinion";

type MeetingOpinionApiItem = Record<string, any> & { id?: number | string };

type MeetingOpinion = {
  id: string;
  code: string;
  title: string;
  description: string;
};

type GetListResponse<T> = {
  message?: string;
  data?: {
    items?: T[] | null;
    totalCount?: number;
  } | null;
};

const mapShareholderItem = (item: ShareholderApiItem): Shareholder => ({
  id: String(item.id),
  name: item.tenCoDong || "Không rõ tên",
  shareholderId: item.maCoDong || "--",
  shares: Number(item.tongCoPhan || 0),
  status: item.isDiemDanh ? "present" : "pending",
});

const getCandidateValue = (
  item: MeetingOpinionApiItem,
  candidates: string[],
): string => {
  for (const candidate of candidates) {
    const key = getMatchedKey(item, candidate);
    const value = key ? item[key] : undefined;
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
};

const mapOpinionItem = (item: MeetingOpinionApiItem): MeetingOpinion => {
  const title =
    getCandidateValue(item, [
      "ten",
      "tenYKien",
      "noiDung",
      "tieuDe",
      "title",
      "tenNghiQuyet",
    ]) || "Ý kiến chưa đặt tên";

  return {
    id: String(item.id ?? ""),
    code: getCandidateValue(item, [
      "ma",
      "maYKien",
      "code",
      "soHieu",
      "maNghiQuyet",
    ]),
    title,
    description: getCandidateValue(item, [
      "moTa",
      "dienGiai",
      "description",
      "ghiChu",
      "noiDungChiTiet",
    ]),
  };
};

const statusConfig: Record<
  AttendanceStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  present: {
    label: "Đã điểm danh",
    color: C.green,
    bg: C.greenLight,
    border: C.greenBorder,
  },
  pending: {
    label: "Chưa điểm danh",
    color: C.slate,
    bg: C.slateLight,
    border: C.slateBorder,
  },
};

const ShareholderRow: React.FC<ShareholderRowProps> = ({
  item,
  onCheckIn,
  onUndoCheckIn,
  isSubmitting = false,
}) => {
  const cfg = statusConfig[item.status];

  return (
    <View style={attStyles.row}>
      <View style={attStyles.rowAvatar}>
        <Text style={attStyles.rowAvatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={attStyles.rowInfo}>
        <Text style={attStyles.rowName}>{item.name}</Text>
        <Text style={attStyles.rowMeta}>
          {item.shareholderId} · {item.shares} CP
        </Text>
      </View>
      <View style={attStyles.rowRight}>
        <View
          style={[
            attStyles.badge,
            { backgroundColor: cfg.bg, borderColor: cfg.border },
          ]}
        >
          <Text style={[attStyles.badgeText, { color: cfg.color }]}>
            {cfg.label}
          </Text>
        </View>
        {item.status === "pending" ? (
          <TouchableOpacity
            style={[
              attStyles.checkInBtn,
              isSubmitting && attStyles.actionBtnDisabled,
            ]}
            onPress={() => onCheckIn(item.id, item.shareholderId)}
            disabled={isSubmitting}
          >
            <Text style={attStyles.checkInBtnText}>
              {isSubmitting ? "Đang xử lý..." : "Điểm danh"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              attStyles.undoCheckInBtn,
              isSubmitting && attStyles.actionBtnDisabled,
            ]}
            onPress={() => onUndoCheckIn(item.id, item.shareholderId)}
            disabled={isSubmitting}
          >
            <Text style={attStyles.undoCheckInBtnText}>
              {isSubmitting ? "Đang xử lý..." : "Huỷ điểm danh"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const VOTING_OPTIONS: Array<{
  key: VotingChoice;
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
}> = [
  {
    key: "agree",
    label: "Tán thành",
    description: "Ghi nhận cổ đông đồng ý với ý kiến đã chọn.",
    color: C.green,
    bg: C.greenLight,
    border: C.greenBorder,
    icon: "check-circle-outline",
  },
  {
    key: "disagree",
    label: "Không tán thành",
    description: "Ghi nhận cổ đông không đồng ý với ý kiến đã chọn.",
    color: C.red,
    bg: "#FFF1F2",
    border: C.redBorder,
    icon: "close-circle-outline",
  },
  {
    key: "noOpinion",
    label: "Không có ý kiến",
    description: "Ghi nhận cổ đông không đưa ra ý kiến.",
    color: C.slate,
    bg: C.slateLight,
    border: C.slateBorder,
    icon: "minus-circle-outline",
  },
];

const ShareholdersMeetingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { can, loaded } = usePermission();

  const [activeTab, setActiveTab] = useState<"attendance" | "voting">(
    "attendance",
  );
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [opinions, setOpinions] = useState<MeetingOpinion[]>([]);
  const [selectedOpinionId, setSelectedOpinionId] = useState<string>("");
  const [selectedVotingChoice, setSelectedVotingChoice] =
    useState<VotingChoice | null>(null);
  const [isOpinionModalVisible, setIsOpinionModalVisible] = useState(false);
  const [opinionSearchQuery, setOpinionSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [isSearching, setIsSearching] = useState(false);
  const [attendanceFilter, setAttendanceFilter] =
    useState<AttendanceFilter>("all");
  const [isMeetingLoading, setIsMeetingLoading] = useState(true);
  const [isVotingLoading, setIsVotingLoading] = useState(false);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [votingError, setVotingError] = useState<string | null>(null);
  const [activeMeeting, setActiveMeeting] =
    useState<ActiveMeetingResponse["data"]>(null);
  const [submittingAttendanceId, setSubmittingAttendanceId] = useState<
    string | null
  >(null);
  const [isRefreshingAttendance, setIsRefreshingAttendance] = useState(false);

  const selectedOpinion = useMemo(
    () => opinions.find((item) => item.id === selectedOpinionId) ?? null,
    [opinions, selectedOpinionId],
  );
  const filteredOpinions = useMemo(() => {
    const keyword = removeVietnameseTones(opinionSearchQuery.trim());

    if (!keyword) return opinions;

    return opinions.filter((item) => {
      const title = removeVietnameseTones(item.title);
      const code = removeVietnameseTones(item.code);
      const description = removeVietnameseTones(item.description);

      return (
        title.includes(keyword) ||
        code.includes(keyword) ||
        description.includes(keyword)
      );
    });
  }, [opinionSearchQuery, opinions]);

  const applyAttendanceStatus = useCallback(
    (shareholderId: string, status: AttendanceStatus) => {
      setShareholders((prev) =>
        prev.map((shareholder) =>
          shareholder.id === shareholderId
            ? { ...shareholder, status }
            : shareholder,
        ),
      );
    },
    [],
  );

  const fetchShareholders = useCallback(async (meetingId: number) => {
    const shareholderRes = await getCodongDhcd<ShareholderListResponse>(
      String(meetingId),
    );

    return Array.isArray(shareholderRes?.data)
      ? shareholderRes.data.map(mapShareholderItem)
      : [];
  }, []);

  const fetchOpinions = useCallback(async (meetingId: number) => {
    const response = await getList<GetListResponse<MeetingOpinionApiItem>>(
      "DaiHoiCoDong_YKien",
      "",
      200,
      0,
      "",
      [
        {
          property: "ID_DaiHoiCoDong",
          operator: 0,
          value: meetingId,
          type: 2,
        },
      ],
      [],
    );

    const items = response?.data?.items ?? [];

    return Array.isArray(items)
      ? items
          .map(mapOpinionItem)
          .filter((item) => Boolean(item.id) && Boolean(item.title))
      : [];
  }, []);

  const reloadShareholders = useCallback(async () => {
    if (!activeMeeting?.id) return;

    const shareholderList = await fetchShareholders(activeMeeting.id);
    setShareholders(shareholderList);
  }, [activeMeeting?.id, fetchShareholders]);

  const reloadOpinions = useCallback(async () => {
    if (!activeMeeting?.id) return;

    try {
      setIsVotingLoading(true);
      setVotingError(null);
      const opinionList = await fetchOpinions(activeMeeting.id);
      setOpinions(opinionList);
      setSelectedOpinionId((prev) =>
        prev && opinionList.some((item) => item.id === prev)
          ? prev
          : opinionList[0]?.id ?? "",
      );
    } catch (error) {
      setOpinions([]);
      setSelectedOpinionId("");
      setVotingError("Không tải được danh sách ý kiến.");
    } finally {
      setIsVotingLoading(false);
    }
  }, [activeMeeting?.id, fetchOpinions]);

  const syncShareholderAttendance = useCallback(
    (shareholderId: string, status: AttendanceStatus) => {
      applyAttendanceStatus(shareholderId, status);
      void reloadShareholders();
    },
    [applyAttendanceStatus, reloadShareholders],
  );

  const canViewAttendance = useMemo(
    () => can("DaiHoiCoDong_CoDong_DiemDanh", "Read"),
    [can, loaded],
  );
  const canViewVoting = useMemo(
    () => can("DaiHoiCoDong_CoDong_YKien", "Read"),
    [can, loaded],
  );

  useEffect(() => {
    if (!loaded) return;

    if (!canViewAttendance && canViewVoting && activeTab !== "voting") {
      setActiveTab("voting");
      return;
    }

    if (!canViewVoting && canViewAttendance && activeTab !== "attendance") {
      setActiveTab("attendance");
    }
  }, [activeTab, canViewAttendance, canViewVoting, loaded]);

  const openScanner = useCallback(() => {
    if (!activeMeeting?.id) {
      Alert.alert("Thông báo", "Chưa có đại hội cổ đông đang hoạt động.");
      return;
    }

    if (activeTab === "voting") {
      if (!selectedOpinion) {
        Alert.alert("Thông báo", "Vui lòng chọn ý kiến trước khi quét QR.");
        return;
      }

      if (!selectedVotingChoice) {
        Alert.alert(
          "Thông báo",
          "Vui lòng chọn phân loại ý kiến trước khi quét QR.",
        );
        return;
      }
    }

    navigation.navigate("ShareholdersMeetingScanner", {
      meetingId: activeMeeting.id,
      scanMode: activeTab,
      votingOpinionId: selectedOpinion ? Number(selectedOpinion.id) : undefined,
      votingOpinionTitle: selectedOpinion?.title,
      votingChoice: selectedVotingChoice ?? undefined,
    });
  }, [
    activeMeeting?.id,
    activeTab,
    navigation,
    selectedOpinion,
    selectedVotingChoice,
  ]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={openScanner}
          style={{ paddingHorizontal: 5 }}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, openScanner]);

  const refreshAttendanceList = useCallback(async () => {
    if (!activeMeeting?.id) return;

    try {
      setIsRefreshingAttendance(true);
      await reloadShareholders();
    } finally {
      setIsRefreshingAttendance(false);
    }
  }, [activeMeeting?.id, reloadShareholders]);

  useEffect(() => {
    if (
      !isFocused ||
      activeTab !== "attendance" ||
      !canViewAttendance ||
      !activeMeeting?.id ||
      submittingAttendanceId
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      void reloadShareholders();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [
    activeMeeting?.id,
    activeTab,
    canViewAttendance,
    isFocused,
    reloadShareholders,
    submittingAttendanceId,
  ]);

  useEffect(() => {
    if (!isFocused || !activeMeeting?.id) return;

    if (activeTab === "attendance") {
      void reloadShareholders();
      return;
    }

    if (activeTab === "voting" && canViewVoting) {
      void reloadOpinions();
    }
  }, [
    activeMeeting?.id,
    activeTab,
    canViewVoting,
    isFocused,
    reloadOpinions,
    reloadShareholders,
  ]);

  useEffect(() => {
    if (!loaded) return;
    if (!canViewAttendance && !canViewVoting) return;

    let cancelled = false;

    const fetchMeetingData = async () => {
      try {
        setIsMeetingLoading(true);
        setMeetingError(null);
        setVotingError(null);

        const activeRes = await getActiveDhcd<ActiveMeetingResponse>();
        const meeting = activeRes?.data ?? null;

        if (cancelled) return;

        if (!meeting || !meeting.id) {
          setActiveMeeting(null);
          setShareholders([]);
          setOpinions([]);
          setSelectedOpinionId("");
          return;
        }

        setActiveMeeting(meeting);

        const tasks: Promise<any>[] = [];

        if (canViewAttendance) {
          tasks.push(
            fetchShareholders(meeting.id).then((data) => {
              if (!cancelled) setShareholders(data);
            }),
          );
        }

        if (canViewVoting) {
          tasks.push(
            fetchOpinions(meeting.id)
              .then((data) => {
                if (cancelled) return;
                setOpinions(data);
                setSelectedOpinionId(data[0]?.id ?? "");
              })
              .catch(() => {
                if (cancelled) return;
                setOpinions([]);
                setSelectedOpinionId("");
                setVotingError("Không tải được danh sách ý kiến.");
              }),
          );
        }

        await Promise.all(tasks);
      } catch (error) {
        if (cancelled) return;

        setActiveMeeting(null);
        setShareholders([]);
        setOpinions([]);
        setSelectedOpinionId("");
        setMeetingError("Không tải được dữ liệu đại hội cổ đông.");
      } finally {
        if (!cancelled) {
          setIsMeetingLoading(false);
        }
      }
    };

    void fetchMeetingData();

    return () => {
      cancelled = true;
    };
  }, [
    canViewAttendance,
    canViewVoting,
    fetchOpinions,
    fetchShareholders,
    loaded,
  ]);

  const handleCheckIn = useCallback(
    (
      id: string,
      shareholderId: string,
      options?: {
        onComplete?: () => void;
        onSuccess?: () => void;
      },
    ) => {
      Alert.alert(
        "Xác nhận điểm danh",
        `Xác nhận điểm danh cổ đông ${shareholderId}?`,
        [
          {
            text: "Huỷ",
            style: "cancel",
            onPress: options?.onComplete,
          },
          {
            text: "Xác nhận",
            onPress: async () => {
              let handledSuccess = false;

              try {
                setSubmittingAttendanceId(id);
                await diemDanhDhcd(Number(id));
                syncShareholderAttendance(id, "present");
                handledSuccess = true;
                options?.onSuccess?.();
              } catch (error) {
                Alert.alert("Lỗi", "Không thể điểm danh cổ đông này.");
              } finally {
                setSubmittingAttendanceId(null);
                if (!handledSuccess) {
                  options?.onComplete?.();
                }
              }
            },
          },
        ],
      );
    },
    [syncShareholderAttendance],
  );

  const handleUndoCheckIn = useCallback(
    (id: string, shareholderId: string) => {
      Alert.alert(
        "Huỷ điểm danh",
        `Bạn có chắc muốn huỷ điểm danh cổ đông ${shareholderId}?`,
        [
          { text: "Không", style: "cancel" },
          {
            text: "Huỷ điểm danh",
            style: "destructive",
            onPress: async () => {
              try {
                setSubmittingAttendanceId(id);
                await huyDiemDanhDhcd(Number(id));
                syncShareholderAttendance(id, "pending");
              } catch (error) {
                Alert.alert("Lỗi", "Không thể huỷ điểm danh cổ đông này.");
              } finally {
                setSubmittingAttendanceId(null);
              }
            },
          },
        ],
      );
    },
    [syncShareholderAttendance],
  );

  const presentCount = shareholders.filter(
    (item) => item.status === "present",
  ).length;
  const pendingCount = shareholders.filter(
    (item) => item.status === "pending",
  ).length;
  const attendanceRate = shareholders.length
    ? Math.round((presentCount / shareholders.length) * 100)
    : 0;
  const filteredShareholders = shareholders.filter((item) => {
    const keyword = removeVietnameseTones(debouncedSearchQuery.trim());
    const normalizedName = removeVietnameseTones(item.name);
    const normalizedCode = removeVietnameseTones(item.shareholderId);
    const matchesSearch =
      !keyword ||
      normalizedName.includes(keyword) ||
      normalizedCode.includes(keyword);

    if (!matchesSearch) return false;

    switch (attendanceFilter) {
      case "presentOrProxy":
        return item.status === "present";
      case "pending":
        return item.status === "pending";
      case "all":
      default:
        return true;
    }
  });

  useEffect(() => {
    setIsSearching(searchQuery !== debouncedSearchQuery);
  }, [searchQuery, debouncedSearchQuery]);

  if (!loaded || isMeetingLoading) {
    return (
      <SafeAreaView
        style={styles.centerState}
        edges={["left", "right", "bottom"]}
      >
        <ActivityIndicator size="small" color={C.accent} />
      </SafeAreaView>
    );
  }

  if (!canViewAttendance && !canViewVoting) {
    return (
      <SafeAreaView
        style={styles.centerState}
        edges={["left", "right", "bottom"]}
      >
        <Text style={styles.emptyTitle}>Bạn không có quyền truy cập</Text>
        <Text style={styles.emptyText}>
          Tài khoản hiện tại không có quyền xem điểm danh hoặc lấy ý kiến cổ
          đông.
        </Text>
      </SafeAreaView>
    );
  }

  if (meetingError) {
    return (
      <SafeAreaView
        style={styles.centerState}
        edges={["left", "right", "bottom"]}
      >
        <Text style={styles.emptyTitle}>Không tải được dữ liệu</Text>
        <Text style={styles.emptyText}>{meetingError}</Text>
      </SafeAreaView>
    );
  }

  if (!activeMeeting) {
    return (
      <SafeAreaView
        style={styles.centerState}
        edges={["left", "right", "bottom"]}
      >
        <Text style={styles.emptyTitle}>Chưa có đợt đại hội cổ đông</Text>
        <Text style={styles.emptyText}>
          Hiện tại chưa có dữ liệu đại hội cổ đông đang hoạt động.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>
          {activeMeeting.ten || "Đại hội cổ đông"}
        </Text>
      </View>

      <View style={styles.tabBar}>
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
                    activeTab === "attendance" ? C.accent : C.surfaceAlt,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  {
                    color: activeTab === "attendance" ? "#FFFFFF" : C.textMuted,
                  },
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
                    activeTab === "voting" ? C.accent : C.surfaceAlt,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  { color: activeTab === "voting" ? "#FFFFFF" : C.textMuted },
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

          <View style={attStyles.searchContainer}>
            <Text style={attStyles.searchIcon}>🔍</Text>
            <TextInput
              style={attStyles.searchInput}
              placeholder="Tìm theo tên hoặc mã cổ đông..."
              placeholderTextColor={C.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <View style={attStyles.spinnerWrapper}>
              {isSearching && <IsLoading size="small" color="#E31E24" />}
            </View>
          </View>

          <FlatList
            data={filteredShareholders}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ShareholderRow
                item={item}
                onCheckIn={handleCheckIn}
                onUndoCheckIn={handleUndoCheckIn}
                isSubmitting={submittingAttendanceId === item.id}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshingAttendance}
                onRefresh={refreshAttendanceList}
                colors={["#E31E24"]}
                tintColor="#E31E24"
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={attStyles.list}
            ItemSeparatorComponent={() => <View style={attStyles.separator} />}
            ListEmptyComponent={
              <View style={attStyles.emptyList}>
                <Text style={attStyles.emptyListText}>
                  Không có cổ đông phù hợp với bộ lọc hiện tại.
                </Text>
              </View>
            }
          />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={voteStyles.summaryRow}>
            <View style={voteStyles.summaryCard}>
              <Text style={voteStyles.summaryNum}>{opinions.length}</Text>
              <Text style={voteStyles.summaryLabel}>Ý kiến</Text>
            </View>
            <View style={voteStyles.summaryCard}>
              <Text style={voteStyles.summaryNum}>
                {selectedOpinion ? 1 : 0}
              </Text>
              <Text style={voteStyles.summaryLabel}>Đã chọn</Text>
            </View>
          </View>

          <Text style={voteStyles.helperText}>
            Chọn ý kiến và phân loại trước, sau đó quét QR cổ đông để ghi nhận.
          </Text>

          <View style={voteStyles.card}>
            <Text style={voteStyles.sectionLabel}>Ý kiến cần lấy</Text>
            <View style={voteStyles.opinionSelector}>
              {isVotingLoading ? (
                <View style={voteStyles.loadingWrap}>
                  <ActivityIndicator size="small" color={C.accent} />
                  <Text style={voteStyles.loadingText}>Đang tải ý kiến...</Text>
                </View>
              ) : opinions.length > 0 ? (
                <>
                  <View style={voteStyles.opinionSelectorHeader}>
                    <Text style={voteStyles.opinionSelectorLabel}>
                      Mở danh sách để chọn đúng ý kiến cần ghi nhận
                    </Text>
                    <View style={voteStyles.opinionSelectorCount}>
                      <Text style={voteStyles.opinionSelectorCountText}>
                        {opinions.length} mục
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={voteStyles.opinionPickerButton}
                    activeOpacity={0.9}
                    onPress={() => setIsOpinionModalVisible(true)}
                  >
                    <View style={voteStyles.opinionPickerButtonLeft}>
                      <MaterialCommunityIcons
                        name="format-list-bulleted-square"
                        size={20}
                        color={C.accent}
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
                      color={C.textMuted}
                    />
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={voteStyles.emptyText}>
                  {votingError || "Chưa có ý kiến nào cho đợt đại hội này."}
                </Text>
              )}
            </View>

            {selectedOpinion && (
              <View style={voteStyles.selectedInfoBox}>
                <View style={voteStyles.selectedInfoHeader}>
                  <View style={voteStyles.selectedInfoBadge}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={16}
                      color={C.accent}
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

          <View style={voteStyles.card}>
            <Text style={voteStyles.sectionLabel}>Phân loại ý kiến</Text>
            <View style={voteStyles.choiceList}>
              {VOTING_OPTIONS.map((option) => {
                const isSelected = selectedVotingChoice === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      voteStyles.choiceCard,
                      {
                        backgroundColor: isSelected ? option.bg : C.surface,
                        borderColor: isSelected ? option.border : C.border,
                      },
                    ]}
                    activeOpacity={0.9}
                    onPress={() => setSelectedVotingChoice(option.key)}
                  >
                    <View style={voteStyles.choiceLeft}>
                      <MaterialCommunityIcons
                        name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
                        size={22}
                        color={isSelected ? option.color : C.textMuted}
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

            {selectedOpinion && selectedVotingChoice && (
              <View style={voteStyles.readyHint}>
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={18}
                  color={C.accent}
                />
                <Text style={voteStyles.readyHintText}>
                  Đã sẵn sàng. Dùng nút quét trên header để scan cổ đông.
                </Text>
              </View>
            )}
          </View>

          <View style={{ height: 28 }} />
        </ScrollView>
      )}

      <Modal
        visible={isOpinionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpinionModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <TouchableOpacity
            style={modalStyles.backdrop}
            activeOpacity={1}
            onPress={() => setIsOpinionModalVisible(false)}
          />
          <View style={modalStyles.sheet}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Chọn ý kiến</Text>
              <TouchableOpacity
                style={modalStyles.closeBtn}
                onPress={() => setIsOpinionModalVisible(false)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color={C.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={modalStyles.searchBox}>
              <MaterialCommunityIcons
                name="magnify"
                size={18}
                color={C.textMuted}
              />
              <TextInput
                style={modalStyles.searchInput}
                placeholder="Tìm theo mã hoặc tên ý kiến..."
                placeholderTextColor={C.textMuted}
                value={opinionSearchQuery}
                onChangeText={setOpinionSearchQuery}
              />
            </View>

            <FlatList
              data={filteredOpinions}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={modalStyles.list}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedOpinionId;
                const title = item.code
                  ? `${item.code} - ${item.title}`
                  : item.title;

                return (
                  <TouchableOpacity
                    style={[
                      modalStyles.item,
                      isSelected && modalStyles.itemActive,
                    ]}
                    activeOpacity={0.9}
                    onPress={() => {
                      setSelectedOpinionId(item.id);
                      setIsOpinionModalVisible(false);
                    }}
                  >
                    <View style={modalStyles.itemTextWrap}>
                      <Text
                        style={[
                          modalStyles.itemTitle,
                          isSelected && modalStyles.itemTitleActive,
                        ]}
                      >
                        {title}
                      </Text>
                      {!!item.description && (
                        <Text style={modalStyles.itemDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                    <MaterialCommunityIcons
                      name={
                        isSelected
                          ? "radiobox-marked"
                          : "radiobox-blank"
                      }
                      size={22}
                      color={isSelected ? C.accent : C.textMuted}
                    />
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={modalStyles.separator} />}
              ListEmptyComponent={
                <Text style={modalStyles.emptyText}>
                  Không tìm thấy ý kiến phù hợp.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  heroCard: {
    backgroundColor: C.accent,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 18,
    padding: 16,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 24,
    textAlign: "center",
  },
  centerState: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: C.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    color: C.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    shadowColor: "#000",
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
    backgroundColor: C.surfaceAlt,
    gap: 6,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  tabActive: {
    borderColor: C.accent,
    backgroundColor: C.accentLight,
  },
  tabIcon: { fontSize: 14 },
  tabLabel: { color: C.textMuted, fontSize: 13, fontWeight: "600" },
  tabLabelActive: { color: C.accent },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeText: { fontSize: 11, fontWeight: "600" },
  content: { flex: 1, paddingTop: 12 },
});

const attStyles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryCardActive: {
    borderColor: C.accent,
    backgroundColor: C.accentLight,
  },
  summaryNum: { color: C.textPrimary, fontSize: 20, fontWeight: "700" },
  summaryNumActive: { color: C.accent },
  summaryLabel: {
    color: C.textMuted,
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
    fontWeight: "600",
  },
  helperText: {
    color: C.textSecondary,
    fontSize: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    marginHorizontal: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: {
    flex: 1,
    color: C.textPrimary,
    paddingVertical: 11,
    fontSize: 14,
  },
  spinnerWrapper: {
    width: 22,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  separator: { height: 1, backgroundColor: C.border, marginVertical: 2 },
  emptyList: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    alignItems: "center",
  },
  emptyListText: {
    color: C.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accentLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: C.accent,
    flexShrink: 0,
  },
  rowAvatarText: { color: C.accent, fontWeight: "700", fontSize: 15 },
  rowInfo: { flex: 1 },
  rowName: { color: C.textPrimary, fontSize: 14, fontWeight: "600" },
  rowMeta: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  rowRight: { alignItems: "flex-end", gap: 6, marginLeft: 8 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  checkInBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  checkInBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  actionBtnDisabled: { opacity: 0.6 },
  undoCheckInBtn: {
    backgroundColor: C.red,
    borderWidth: 1,
    borderColor: C.redBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  undoCheckInBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
});

const voteStyles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryNum: { color: C.textPrimary, fontSize: 22, fontWeight: "700" },
  summaryLabel: {
    color: C.textMuted,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
  helperText: {
    color: C.textSecondary,
    fontSize: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionLabel: {
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  opinionSelector: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.surfaceAlt,
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
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  opinionSelectorCount: {
    backgroundColor: C.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  opinionSelectorCountText: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  opinionPickerButton: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
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
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  opinionPickerValue: {
    color: C.textPrimary,
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
    color: C.textSecondary,
    fontSize: 13,
  },
  emptyText: {
    color: C.textSecondary,
    fontSize: 13,
    textAlign: "center",
    padding: 18,
  },
  selectedInfoBox: {
    marginTop: 12,
    backgroundColor: C.accentLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#C5D3F5",
  },
  selectedInfoHeader: {
    marginBottom: 8,
  },
  selectedInfoBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C5D3F5",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  selectedInfoBadgeText: {
    color: C.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  selectedInfoTitle: {
    color: C.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  selectedInfoDesc: {
    color: C.textSecondary,
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
    color: C.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  choiceDesc: {
    color: C.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  readyHint: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.accentLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C5D3F5",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readyHintText: {
    flex: 1,
    color: C.accent,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 25, 35, 0.32)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: "78%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    color: C.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceAlt,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: C.textPrimary,
    fontSize: 14,
    paddingVertical: 12,
    marginLeft: 8,
  },
  list: {
    paddingBottom: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  itemActive: {
    borderColor: C.accent,
    backgroundColor: C.accentLight,
  },
  itemTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  itemTitle: {
    color: C.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  itemTitleActive: {
    color: C.accent,
  },
  itemDesc: {
    color: C.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  separator: {
    height: 8,
  },
  emptyText: {
    color: C.textSecondary,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 24,
  },
});

export default ShareholdersMeetingScreen;
