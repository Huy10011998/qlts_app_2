import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, TouchableOpacity } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNetworkAwareReload } from "../../../hooks/useNetworkAwareReload";
import { usePermission } from "../../../hooks/usePermission";
import { useDebounce } from "../../../hooks/useDebounce";
import {
  diemDanhDhcd,
  getActiveDhcd,
  getCodongDhcd,
  getList,
  huyDiemDanhDhcd,
} from "../../../services/data/callApi";
import type {
  ActiveMeetingResponse,
  AttendanceFilter,
  AttendanceStatus,
  Shareholder,
  ShareholderListResponse,
} from "../../../types/index";
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
import { error, log } from "../../../utils/Logger";

const getApiErrorMessage = (err: unknown, fallback: string) => {
  const apiError = err as
    | {
        code?: string;
        config?: { url?: string; method?: string };
        message?: string;
        response?: { status?: number; data?: { message?: string } | string };
      }
    | undefined;
  const status = apiError?.response?.status;
  const method = apiError?.config?.method?.toUpperCase();
  const url = apiError?.config?.url;
  const responseMessage =
    typeof apiError?.response?.data === "object"
      ? apiError.response.data?.message
      : undefined;
  const detail = [
    status ? `HTTP ${status}` : apiError?.code,
    method,
    url,
    responseMessage || apiError?.message,
  ]
    .filter(Boolean)
    .join(" - ");

  return detail ? `${fallback}\n${detail}` : fallback;
};

function ShareholdersMeetingScannerButton({
  disabled = false,
  onPress,
}: {
  disabled?: boolean;
  onPress: () => void;
}) {
  return React.createElement(
    TouchableOpacity,
    {
      disabled,
      onPress,
      style: { opacity: disabled ? 0.45 : 1, paddingHorizontal: 5 },
    },
    React.createElement(MaterialCommunityIcons, {
      name: "qrcode-scan",
      size: 24,
      color: "#fff",
    }),
  );
}

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
  const isMountedRef = useRef(true);
  const loadRequestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
      reloadShareholders();
    },
    [applyAttendanceStatus, reloadShareholders],
  );

  const canViewAttendance = useMemo(
    () => can("DaiHoiCoDong_CoDong_DiemDanh", "Read"),
    [can],
  );
  const canViewVoting = useMemo(
    () => can("DaiHoiCoDong_CoDong_YKien", "Read"),
    [can],
  );
  const hasAnyViewPermission = canViewAttendance || canViewVoting;
  const isMeetingLocked = useMemo(
    () =>
      activeMeeting?.isLock === true ||
      (shareholders.length > 0 &&
        shareholders.every((shareholder) => shareholder.isLock)),
    [activeMeeting?.isLock, shareholders],
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

    if (isMeetingLocked) {
      Alert.alert(
        "Đại hội đã khóa",
        "Dữ liệu đại hội cổ đông đã khóa, bạn chỉ có thể xem thông tin.",
      );
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
    isMeetingLocked,
    navigation,
    selectedOpinion,
    selectedVotingChoice,
  ]);

  const renderHeaderRight = useCallback(
    () =>
      ShareholdersMeetingScannerButton({
        disabled: isMeetingLocked,
        onPress: openScanner,
      }),
    [isMeetingLocked, openScanner],
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderRight]);

  const refreshAttendanceList = useCallback(async () => {
    if (!activeMeeting?.id) return;

    try {
      setIsRefreshingAttendance(true);
      await reloadShareholders();
    } finally {
      setIsRefreshingAttendance(false);
    }
  }, [activeMeeting?.id, reloadShareholders]);

  const loadMeetingData = useCallback(async (options?: { silent?: boolean }) => {
    if (!loaded) return;
    if (!hasAnyViewPermission) {
      setIsMeetingLoading(false);
      return;
    }

    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    const canCommit = () =>
      isMountedRef.current && loadRequestIdRef.current === requestId;

    try {
      if (!options?.silent) {
        setIsMeetingLoading(true);
      }

      const activeRes = await getActiveDhcd<ActiveMeetingResponse>();
      log("[DHCD] getActiveDhcd response:", activeRes);
      const meeting = activeRes?.data ?? null;
      log("[DHCD] active meeting data:", meeting);

      if (!canCommit()) return;

      setMeetingError(null);

      if (!meeting || !meeting.id) {
        setActiveMeeting(null);
        setShareholders([]);
        setOpinions([]);
        setSelectedOpinionId("");
        setVotingError(null);
        return;
      }

      setActiveMeeting(meeting);

      const tasks: Promise<any>[] = [];

      if (canViewAttendance) {
        tasks.push(
          fetchShareholders(meeting.id)
            .then((data) => {
              log("[DHCD] shareholders loaded:", {
                meetingId: meeting.id,
                count: data.length,
              });
              if (!canCommit()) return;
              setShareholders(data);
            })
            .catch((err) => {
              error("[DHCD] fetchShareholders error:", err);
              if (canCommit()) {
                setShareholders([]);
                setMeetingError(
                  getApiErrorMessage(
                    err,
                    "Không tải được danh sách cổ đông.",
                  ),
                );
              }
            }),
        );
      }

      if (canViewVoting) {
        tasks.push(
          fetchOpinions(meeting.id)
            .then((data) => {
              log("[DHCD] opinions loaded:", {
                meetingId: meeting.id,
                count: data.length,
              });
              if (!canCommit()) return;
              setOpinions(data);
              setSelectedOpinionId(data[0]?.id ?? "");
              setVotingError(null);
            })
            .catch((err) => {
              error("[DHCD] fetchOpinions error:", err);
              if (!canCommit()) return;
              setOpinions([]);
              setSelectedOpinionId("");
              setVotingError(
                getApiErrorMessage(err, "Không tải được danh sách ý kiến."),
              );
            }),
        );
      } else {
        setVotingError(null);
      }

      await Promise.all(tasks);
    } catch (err) {
      if (!canCommit()) return;
      setActiveMeeting(null);
      setShareholders([]);
      setOpinions([]);
      setSelectedOpinionId("");
      error("[DHCD] loadMeetingData error:", err);
      setMeetingError(
        getApiErrorMessage(err, "Không tải được dữ liệu đại hội cổ đông."),
      );
    } finally {
      if (canCommit()) {
        setIsMeetingLoading(false);
      }
    }
  }, [
    canViewAttendance,
    canViewVoting,
    fetchOpinions,
    fetchShareholders,
    hasAnyViewPermission,
    loaded,
  ]);

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
      reloadShareholders();
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
      reloadShareholders();
      return;
    }

    if (activeTab === "voting" && canViewVoting) {
      reloadOpinions();
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
    loadMeetingData();
  }, [loadMeetingData]);

  useNetworkAwareReload(() => {
    loadMeetingData({ silent: true });
  }, {
    enabled: isFocused && loaded && hasAnyViewPermission,
    hasError: Boolean(meetingError || votingError),
    onOffline: () => {
      setMeetingError("Không tải được dữ liệu đại hội cổ đông.");
    },
  });

  const handleCheckIn = useCallback(
    (
      id: string,
      shareholderId: string,
      options?: {
        onComplete?: () => void;
        onSuccess?: () => void;
      },
    ) => {
      const shareholder = shareholders.find((item) => item.id === id);

      if (shareholder?.isLock) {
        Alert.alert(
          "Cổ đông đã khóa",
          `Cổ đông ${shareholderId} đã khóa, bạn chỉ có thể xem thông tin.`,
        );
        options?.onComplete?.();
        return;
      }

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
    [shareholders, syncShareholderAttendance],
  );

  const handleUndoCheckIn = useCallback(
    (id: string, shareholderId: string) => {
      const shareholder = shareholders.find((item) => item.id === id);

      if (shareholder?.isLock) {
        Alert.alert(
          "Cổ đông đã khóa",
          `Cổ đông ${shareholderId} đã khóa, bạn chỉ có thể xem thông tin.`,
        );
        return;
      }

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
    [shareholders, syncShareholderAttendance],
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
