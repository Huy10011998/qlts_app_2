import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

import AssetFormScreenShell from "../../../components/assets/shared/AssetFormScreenShell";
import { createAssetFormBaseStyles } from "../../../components/assets/shared/assetFormStyles";
import { showAppToast } from "../../../components/ui/AppToast";
import EmptyState from "../../../components/ui/EmptyState";
import { useUnsavedChangesGuard } from "../../../hooks/useUnsavedChangesGuard";
import { cvChiTiet, cvNhanVien, cvSua, cvThem } from "../../../services/data/congViecApi";
import { flowTaoCongViec } from "../../../services/data/flowApi";
import {
  CV_CONG_VIEC_NAME_CLASS,
  isWorkflowNotFound,
  uploadWorkflowFile,
} from "../../../services/data/workflowApi";
import type {
  CongViecChiTiet,
  CongViecSavePayload,
  CongViecThamGiaPayload,
  StackNavigation,
  StackRoute,
  WorkflowEmployee,
  WorkflowPickedFile,
} from "../../../types/index";
import { AppColors, C, useAppColors, useStyles } from "../../../utils/helpers/colors";
import DateTimeField from "../shared/components/DateTimeField";
import PendingFilesField from "../shared/components/PendingFilesField";
import WorkflowButton from "../shared/components/WorkflowButton";
import {
  WorkflowFormFields,
  WorkflowFormPickerModal,
} from "../shared/components/WorkflowFormFields";
import WorkflowFormSkeleton from "../shared/components/WorkflowFormSkeleton";
import WorkflowSection from "../shared/components/WorkflowSection";
import { useFormDirty } from "../shared/useFormDirty";
import { useWorkflowDynamicForm } from "../shared/useWorkflowDynamicForm";
import { useWorkflowMe } from "../shared/useWorkflowMe";
import { useMarkWorkflowChanged } from "../shared/useWorkflowVersion";
import { CV_VAI_TRO } from "../shared/workflowConstants";
import { atHour, parseBeDate, startOfDay, toBeDateTime } from "../shared/workflowDate";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import {
  buildDynamicPayload,
  buildInitialFormData,
  getFormFields,
  readItemValue,
  WorkflowField,
} from "../shared/workflowFields";
import { loadClassFields } from "../shared/workflowMetadata";
import { formatWeekday } from "../Lich/lichHelpers";
import DinhKyEditor, {
  createDinhKyState,
  DinhKyState,
  toDinhKyInput,
  toDinhKyPayload,
} from "./components/DinhKyEditor";
import { buildDinhKyDates, validateDinhKyDates } from "./dinhKyRules";
import ThamGiaEditor from "./components/ThamGiaEditor";
import {
  CV_DYNAMIC_SAVE_KEYS,
  CV_FORM_CUSTOM_FIELDS,
  shiftDenNgay,
  validateDinhKy,
  validateThamGias,
  validateTuDen,
} from "./congViecRules";
import { AppAlert } from "../../../components/ui/AppAlert";

/** "yyyy-MM-dd" (ngày bấm trên lịch) → Date lúc 00:00. */
const parseNgay = (ngay?: string) => {
  const date = ngay ? parseBeDate(ngay) : null;
  return date ?? new Date();
};

const toNumberOr = (value: unknown, fallback: number | null) => {
  const num = Number(value);
  return value == null || value === "" || !Number.isFinite(num) ? fallback : num;
};

/**
 * Form thêm / sửa công việc (mục 4). Phần động (TieuDe, Loại, Kế hoạch, MoTa,
 * Khẩn, Quan trọng) theo metadata; Từ / Đến (ngày + giờ), người tham gia, định
 * kỳ, đính kèm vẽ riêng. cv-them / cv-sua chỉ nhận đúng các khoá của mục 4.
 *
 * Mở từ lượt duyệt cuối của phiếu ("Tạo công việc", mục 9 file Flow) thì lưu
 * bằng flow-tao-cong-viec: server vừa duyệt phiếu vừa giao việc.
 */
export default function CongViecFormScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const navigation = useNavigation<StackNavigation<"CongViecForm">>();
  const route = useRoute<StackRoute<"CongViecForm">>();
  const params = route.params;
  const isEdit = params.mode === "edit";
  const fromFlow = params.fromFlow;
  // Nhân bản = thêm mới, điền sẵn từ việc gốc (cv-them, ra việc Mới, số mới).
  const cloneId = !isEdit && !fromFlow ? params.cloneId : undefined;
  const sourceId = isEdit ? params.id : cloneId;
  const { me, loading: meLoading } = useWorkflowMe();
  const markChanged = useMarkWorkflowChanged();

  const [fields, setFields] = useState<WorkflowField[] | null>(null);
  const [employees, setEmployees] = useState<WorkflowEmployee[]>([]);
  const [detail, setDetail] = useState<CongViecChiTiet | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ngayMacDinh = parseNgay(params.ngay);
  const [tuNgay, setTuNgay] = useState<Date | null>(atHour(ngayMacDinh, 8));
  const [denNgay, setDenNgay] = useState<Date | null>(atHour(ngayMacDinh, 17));
  const [isKhongChuyenChuTri, setIsKhongChuyenChuTri] = useState(false);
  const [thamGias, setThamGias] = useState<CongViecThamGiaPayload[]>([]);
  const [dinhKy, setDinhKy] = useState<DinhKyState>(createDinhKyState(ngayMacDinh));
  const [files, setFiles] = useState<WorkflowPickedFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    navigation.setOptions({
      title: fromFlow
        ? "Tạo công việc"
        : isEdit
        ? "Sửa công việc"
        : cloneId
        ? "Nhân bản công việc"
        : "Thêm công việc",
    });
  }, [cloneId, fromFlow, isEdit, navigation]);

  // Mở từ Lịch (bấm + của một ngày): ghi ngày đang tạo lên badge của header để
  // người dùng biết đang thêm việc cho ngày nào. Theo Từ ngày hiện tại của form
  // chứ không theo ngày đã bấm — đổi ngày trong form thì header đổi theo.
  const isFromLich = !isEdit && !fromFlow && !cloneId && !!params.ngay;
  const headerDayLabel = isFromLich && tuNgay ? formatWeekday(tuNgay) : undefined;
  useEffect(() => {
    navigation.setOptions({
      headerBadgeLabel: headerDayLabel,
      headerBadgeIcon: headerDayLabel ? "calendar-outline" : undefined,
    } as Partial<NativeStackNavigationOptions>);
  }, [headerDayLabel, navigation]);

  useEffect(() => {
    let alive = true;

    Promise.all([
      loadClassFields(CV_CONG_VIEC_NAME_CLASS),
      cvNhanVien().catch(() => [] as WorkflowEmployee[]),
      sourceId ? cvChiTiet(sourceId) : Promise.resolve(null),
    ])
      .then(([metadata, staff, chiTiet]) => {
        if (!alive) return;
        setFields(metadata);
        setEmployees(staff);
        setDetail(chiTiet);

        if (chiTiet) {
          const cv = chiTiet.congViec;
          setTuNgay(parseBeDate(cv.tuNgay));
          setDenNgay(parseBeDate(cv.denNgay));
          // Sửa phải gửi lại đúng giá trị của cv-chi-tiet (null → false), đừng
          // để mặc định — chỉ người tạo đổi được ô này.
          setIsKhongChuyenChuTri(!!cv.isKhongChuyenChuTri);
          setThamGias(
            chiTiet.thamGias.map((item) => ({
              ID_NhanVien: Number(item.iD_NhanVien),
              VaiTro: Number(item.vaiTro),
            })),
          );
        }
      })
      .catch((err) => {
        if (!alive) return;
        if (isWorkflowNotFound(err)) {
          AppAlert.alert("Thông báo", "Không tìm thấy công việc.", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
          return;
        }
        setLoadError(getWorkflowErrorMessage(err, "Không tải được form."));
      });

    return () => {
      alive = false;
    };
    // navigation ổn định suốt đời màn — chỉ chạy lại khi đổi việc đang sửa / nhân bản.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  // Ngày bắt đầu định kỳ chưa sửa tay thì đi theo ngày của Từ ngày.
  useEffect(() => {
    if (!tuNgay) return;
    setDinhKy((prev) =>
      prev.ngayBatDauAuto ? { ...prev, ngayBatDau: startOfDay(tuNgay) } : prev,
    );
  }, [tuNgay]);

  // Thêm mới: Chủ trì mặc định là chính mình.
  useEffect(() => {
    if (isEdit || !me.iD_NhanVien) return;
    setThamGias((prev) =>
      prev.length ? prev : [{ ID_NhanVien: me.iD_NhanVien!, VaiTro: CV_VAI_TRO.ChuTri }],
    );
  }, [isEdit, me.iD_NhanVien]);

  const formFields = useMemo(
    () =>
      getFormFields(fields ?? [], {
        exclude: CV_FORM_CUSTOM_FIELDS,
        only: CV_DYNAMIC_SAVE_KEYS,
      }),
    [fields],
  );

  /** Giá trị gốc của các khoá động: bản ghi đang sửa, hoặc giá trị điền sẵn khi thêm. */
  const baseValues = useMemo<Record<string, any>>(() => {
    if (detail) {
      const cv = detail.congViec;
      return {
        TieuDe: cv.tieuDe ?? "",
        MoTa: cv.moTa ?? null,
        ID_LoaiCongViec: cv.iD_LoaiCongViec ?? null,
        ID_KeHoach: cv.iD_KeHoach ?? null,
        MucDoKhan: cv.mucDoKhan ?? 0,
        MucDoQuanTrong: cv.mucDoQuanTrong ?? 0,
      };
    }

    // Mục 9: "Giao công việc từ phiếu …" chỉ là banner trên đầu form, KHÔNG ghi
    // vào MoTa — MoTa điền sẵn đúng taoCongViec.moTa.
    const prefill = fromFlow?.prefill;

    return {
      TieuDe: prefill?.tieuDe ?? "",
      MoTa: prefill?.moTa || null,
      ID_LoaiCongViec: prefill?.iD_LoaiCongViec ?? null,
      ID_KeHoach: params.keHoach?.id ?? null,
      MucDoKhan: 0,
      MucDoQuanTrong: 0,
    };
  }, [detail, fromFlow, params.keHoach?.id]);

  const initialData = useMemo(() => {
    if (!fields) return null;
    if (detail) return buildInitialFormData(formFields, detail.congViec);

    const initial: Record<string, any> = {};
    Object.entries(baseValues).forEach(([key, value]) => {
      if (value != null && value !== "") initial[key] = value;
    });
    if (params.keHoach) {
      initial.ID_KeHoach_MoTa = params.keHoach.text ?? "";
    }
    return initial;
  }, [baseValues, detail, fields, formFields, params.keHoach]);

  const form = useWorkflowDynamicForm(formFields, initialData, isEdit ? "edit" : "add");

  // Phần vẽ riêng (ngày, người tham gia, định kỳ) có thay đổi chưa lưu chưa; phần
  // động do `form` tự theo dõi, file chờ tải lên tính riêng.
  const { isDirty: extrasDirty, markTouched } = useFormDirty(
    JSON.stringify([
      tuNgay?.getTime() ?? null,
      denNgay?.getTime() ?? null,
      isKhongChuyenChuTri,
      thamGias,
      dinhKy,
    ]),
  );

  const fallbackNames = useMemo(() => {
    const names: Record<number, string> = {};
    detail?.thamGias.forEach((item) => {
      names[Number(item.iD_NhanVien)] = item.ten;
    });
    return names;
  }, [detail]);

  const canEditKhongChuyen = !isEdit || !!detail?.quyen.isNguoiTao;
  const showDinhKy = !isEdit && !fromFlow;

  // Chỉ hỏi khi form đã hiện (sửa: bản ghi đã nạp xong) — đang khung chờ hay lỗi
  // tải thì chưa có gì để mất. Mở từ lượt duyệt phiếu ("Tạo công việc") thì luôn
  // hỏi: rời form là bỏ luôn lượt duyệt, phiếu vẫn nằm chờ.
  const formReady = !loadError && !!fields && !meLoading && (!sourceId || !!detail);
  const { leaveWithoutPrompt } = useUnsavedChangesGuard(
    formReady && (!!fromFlow || form.isDirty || extrasDirty || files.length > 0),
    {
      message: fromFlow
        ? "Phiếu chưa được duyệt. Rời màn này là bỏ lượt duyệt vừa chọn, nội dung công việc vừa nhập cũng mất."
        : undefined,
    },
  );

  /** Đổi Từ ngày: Đến ngày rơi về trước thì dời theo, giữ thời lượng việc. */
  const changeTuNgay = (next: Date | null) => {
    markTouched();
    setDenNgay((prev) => shiftDenNgay(tuNgay, next, prev));
    setTuNgay(next);
  };

  const buildPayload = (): CongViecSavePayload => {
    const dyn = buildDynamicPayload(formFields, form.formData);
    const pick = (key: string) => {
      const field = formFields.find((item) => item.name.toLowerCase() === key.toLowerCase());
      return field ? dyn[field.name] : readItemValue(baseValues, key);
    };

    return {
      ID: isEdit ? Number(params.id) : 0,
      TieuDe: String(pick("TieuDe") ?? "").trim(),
      MoTa: (pick("MoTa") as string | null) ?? null,
      ID_LoaiCongViec: toNumberOr(pick("ID_LoaiCongViec"), null),
      ID_KeHoach: toNumberOr(pick("ID_KeHoach"), null),
      MucDoKhan: toNumberOr(pick("MucDoKhan"), 0) ?? 0,
      MucDoQuanTrong: toNumberOr(pick("MucDoQuanTrong"), 0) ?? 0,
      TuNgay: tuNgay ? toBeDateTime(tuNgay) : "",
      DenNgay: denNgay ? toBeDateTime(denNgay) : "",
      IsKhongChuyenChuTri: isKhongChuyenChuTri,
      ThamGias: thamGias,
      DinhKy: showDinhKy ? toDinhKyPayload(dinhKy) : null,
    };
  };

  const validate = (payload: CongViecSavePayload) => {
    const requiredMessage = form.validateRequired();
    if (requiredMessage) return requiredMessage;
    if (!payload.TieuDe) return "Vui lòng nhập tiêu đề.";

    const dinhKyInput = showDinhKy ? toDinhKyInput(dinhKy) : null;
    const nextErrors = {
      tuDen: validateTuDen(tuNgay, denNgay),
      thamGia: validateThamGias(thamGias),
      // Luật payload trước, rồi mới chạy thử luật sinh (không ra lần nào / quá 366).
      dinhKy:
        validateDinhKy(payload.DinhKy) ??
        (dinhKyInput ? validateDinhKyDates(buildDinhKyDates(dinhKyInput)) : null),
    };
    setErrors(nextErrors);
    return nextErrors.tuDen ?? nextErrors.thamGia ?? nextErrors.dinhKy ?? null;
  };

  const uploadFiles = async (idCongViec: number) => {
    const failed: string[] = [];
    for (const file of files) {
      try {
        await uploadWorkflowFile(CV_CONG_VIEC_NAME_CLASS, idCongViec, file);
      } catch (err) {
        failed.push(`- ${file.name}: ${getWorkflowErrorMessage(err, "lỗi tải lên")}`);
      }
    }
    return failed;
  };

  const handleSave = async () => {
    const payload = buildPayload();
    const message = validate(payload);
    if (message) {
      AppAlert.alert("Thiếu thông tin", message);
      return;
    }

    try {
      setSubmitting(true);
      const result = fromFlow
        ? await flowTaoCongViec(fromFlow.nameClass, {
            ID_HoSo: fromFlow.idHoSo,
            YKien: fromFlow.yKien,
            CongViec: payload,
          })
        : isEdit
        ? await cvSua(payload)
        : await cvThem(payload);

      if (result.loi || !(result.id > 0)) {
        // Giao việc từ phiếu bị từ chối (vd người khác vừa xử lý phiếu — mục 8e
        // phiếu): nạp lại phiếu / danh sách khi quay về để nút Duyệt tự ẩn.
        if (fromFlow) markChanged();
        AppAlert.alert("Không lưu được", result.loi || "Vui lòng thử lại.");
        return;
      }

      const failed = files.length ? await uploadFiles(result.id) : [];
      markChanged();

      const title = fromFlow
        ? "Đã tạo công việc"
        : isEdit
        ? "Đã lưu công việc"
        : result.soLuong > 1
        ? `Đã tạo ${result.soLuong} công việc`
        : "Đã tạo công việc";
      // Đã lưu: rời form không hỏi "Bỏ thay đổi?" nữa.
      const leave = () => leaveWithoutPrompt(() => navigation.goBack());

      // File hỏng vẫn phải báo bằng Alert để người dùng đọc được tên file.
      if (failed.length) {
        AppAlert.alert(title, `Một số file chưa tải lên được:\n${failed.join("\n")}`, [
          { text: "OK", onPress: leave },
        ]);
        return;
      }

      const soPhieu = fromFlow ? fromFlow.prefill?.soPhieu ?? fromFlow.soPhieu : null;
      showAppToast({
        message: title,
        detail: fromFlow ? (soPhieu ? `Đã duyệt phiếu ${soPhieu}` : "Đã duyệt phiếu") : undefined,
      });
      leave();
    } catch (err) {
      AppAlert.alert("Không lưu được", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return <EmptyState iconName="alert-circle-outline" title="Không mở được form" subtitle={loadError} />;
  }

  // Khung "Giao công việc từ phiếu" chỉ cần route param — vẽ thật cả lúc chờ,
  // khỏi một khối ~120pt bật vào đẩy cả form xuống khi dữ liệu về.
  const fromFlowIntro = fromFlow ? (
    <>
      <Text style={styles.flowBanner}>
        {(fromFlow.prefill?.soPhieu ?? fromFlow.soPhieu)
          ? `Giao công việc từ phiếu ${fromFlow.prefill?.soPhieu ?? fromFlow.soPhieu}`
          : "Giao công việc từ phiếu đề nghị"}
      </Text>
      <Text style={styles.notice}>
        Lưu công việc này là DUYỆT phiếu và giao việc. Đóng form không lưu thì phiếu chưa được
        duyệt.
      </Text>
    </>
  ) : null;

  if (!fields || meLoading || (sourceId && !detail)) {
    return <WorkflowFormSkeleton header={fromFlowIntro} />;
  }

  return (
    <AssetFormScreenShell
      brandColor={C.red}
      contentContainerStyle={styles.scrollContent}
      isSubmitting={submitting}
      loadingOverlayStyle={styles.loadingOverlay}
      style={styles.container}
      modal={<WorkflowFormPickerModal form={form} />}
      footer={
        <WorkflowButton
          label={fromFlow ? "Tạo công việc" : "Lưu"}
          icon="checkmark-circle-outline"
          onPress={handleSave}
          disabled={submitting}
        />
      }
    >
      {fromFlowIntro}

      <WorkflowFormFields form={form} styles={styles} />

      <WorkflowSection title="Thời gian" icon="time-outline">
        <DateTimeField label="Từ ngày" required value={tuNgay} onChange={changeTuNgay} />
        <DateTimeField
          label="Đến ngày"
          required
          minDate={tuNgay}
          value={denNgay}
          onChange={(next) => {
            markTouched();
            setDenNgay(next);
          }}
          error={errors.tuDen}
        />
      </WorkflowSection>

      <WorkflowSection title="Người tham gia" icon="people-outline">
        <ThamGiaEditor
          employees={employees}
          value={thamGias}
          onChange={(next) => {
            markTouched();
            setThamGias(next);
          }}
          fallbackNames={fallbackNames}
          error={errors.thamGia}
          lockChuTri={isEdit && !detail?.quyen.duocDoiChuTri}
        />
        <View style={styles.switchRow}>
          <View style={styles.switchBody}>
            <Text style={styles.switchLabel}>Không được chuyển người chủ trì</Text>
            <Text style={styles.switchHint}>
              Bật: chủ trì không tự đổi chủ trì. Chỉ người tạo đổi được ô này.
            </Text>
          </View>
          <Switch
            value={isKhongChuyenChuTri}
            onValueChange={(next) => {
              markTouched();
              setIsKhongChuyenChuTri(next);
            }}
            disabled={!canEditKhongChuyen}
            trackColor={{ true: c.red, false: c.borderStrong }}
            thumbColor="#FFFFFF"
          />
        </View>
      </WorkflowSection>

      {showDinhKy ? (
        <WorkflowSection title="Định kỳ" icon="repeat-outline">
          <DinhKyEditor
            value={dinhKy}
            onChange={(next) => {
              markTouched();
              setDinhKy(next);
            }}
            tuNgay={tuNgay}
            denNgay={denNgay}
          />
          {errors.dinhKy ? <Text style={styles.error}>{errors.dinhKy}</Text> : null}
        </WorkflowSection>
      ) : null}

      <WorkflowSection title="Đính kèm" icon="attach-outline">
        <PendingFilesField
          label="File đính kèm"
          files={files}
          onChange={setFiles}
          hint={
            showDinhKy && dinhKy.enabled
              ? "Định kỳ: file gắn vào lần đầu."
              : "Tối đa 20MB mỗi file. File được tải lên sau khi lưu."
          }
        />
      </WorkflowSection>
    </AssetFormScreenShell>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    ...createAssetFormBaseStyles(c),
    // Khung xanh trên cùng form (mục 9), chỉ để hiển thị.
    flowBanner: {
      fontSize: 14,
      fontWeight: "700",
      color: c.accent,
      backgroundColor: c.accentLight,
      borderColor: c.accent,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
    },
    notice: {
      fontSize: 13,
      color: c.textSecondary,
      backgroundColor: c.amberLight,
      borderColor: c.amberBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 12,
    },
    switchBody: {
      flex: 1,
    },
    switchLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
    },
    switchHint: {
      fontSize: 12,
      color: c.textSub,
      marginTop: 2,
    },
    error: {
      fontSize: 12,
      color: c.red,
      marginTop: 4,
    },
  });
