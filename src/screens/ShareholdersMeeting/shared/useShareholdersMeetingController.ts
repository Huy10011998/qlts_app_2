import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, TouchableOpacity } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { usePermission } from "../../../hooks/usePermission";
import { useDebounce } from "../../../hooks/useDebounce";
import {
  diemDanhDhcd,
  getActiveDhcd,
  getCodongDhcd,
  getList,
  huyDiemDanhDhcd,
} from "../../../services/data/CallApi";
import {
  ActiveMeetingResponse,
  AttendanceFilter,
  AttendanceStatus,
  Shareholder,
  ShareholderListResponse,
} from "../../../types/Index";
import {
  filterMeetingOpinions,
  filterShareholders,
  GetListResponse,
  getAttendanceSummary,
  mapOpinionItem,
  mapShareholderItem,
  MeetingOpinion,
  MeetingOpinionApiItem,
  VotingChoice,
} from "./shareholdersMeetingHelpers";

export function useShareholdersMeetingController() {
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
  const [isMeetingLoading, setIsMeetingLoading] = useState(false);
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

  const filteredOpinions = useMemo(
    () => filterMeetingOpinions(opinions, opinionSearchQuery),
    [opinionSearchQuery, opinions],
  );

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
  const hasAnyViewPermission = canViewAttendance || canViewVoting;

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
        React.createElement(
          TouchableOpacity,
          {
            onPress: openScanner,
            style: { paddingHorizontal: 5 },
          },
          React.createElement(MaterialCommunityIcons, {
            name: "qrcode-scan",
            size: 24,
            color: "#fff",
          }),
        )
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
    if (!hasAnyViewPermission) {
      setIsMeetingLoading(false);
      return;
    }

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
    hasAnyViewPermission,
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

  const { attendanceRate, pendingCount, presentCount } = useMemo(
    () => getAttendanceSummary(shareholders),
    [shareholders],
  );

  const filteredShareholders = useMemo(
    () =>
      filterShareholders(
        shareholders,
        debouncedSearchQuery,
        attendanceFilter,
      ),
    [attendanceFilter, debouncedSearchQuery, shareholders],
  );

  useEffect(() => {
    setIsSearching(searchQuery !== debouncedSearchQuery);
  }, [searchQuery, debouncedSearchQuery]);

  return {
    activeMeeting,
    activeTab,
    attendanceFilter,
    attendanceRate,
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
    refreshAttendanceList,
    votingError,
  };
}
