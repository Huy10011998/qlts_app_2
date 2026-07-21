import { callApi } from "./httpClient";
import { API_ENDPOINTS } from "../../config/index";
import { SqlOperator, TypeProperty } from "../../utils/Enum";
import type { Conditions } from "../../types";

// Query conditions accept numbers too (ids), unlike the strict string `Conditions`.
type QueryCondition = Omit<Conditions, "value"> & { value: string | number };

const listRequest = (conditions: QueryCondition[]) => ({
  orderby: null,
  pageSize: null,
  skipSize: null,
  conditions,
  searchText: null,
  conditionsAll: [],
});

/** Vehicle id + [fromDate, toDate] range — the shape repeated by the tracking/journey endpoints. */
const trackingConditions = (
  vehicleId: string | number,
  fromDate: string,
  toDate: string,
): QueryCondition[] => [
  {
    property: "ID_PhuongTien",
    operator: SqlOperator.Equals,
    value: vehicleId,
    type: TypeProperty.Int,
  },
  {
    property: "Ngay",
    operator: SqlOperator.GreaterThanOrEqual,
    value: fromDate,
    type: TypeProperty.Date,
  },
  {
    property: "Ngay",
    operator: SqlOperator.LessThanOrEqual,
    value: toDate,
    type: TypeProperty.Date,
  },
];

export const getPhuongTien = async <T = any,>() =>
  callApi<T>(
    "POST",
    API_ENDPOINTS.GET_PHUONG_TIEN,
    listRequest([
      {
        property: "ID_Tracking",
        operator: SqlOperator.IsNotEmpty,
        value: "",
        type: TypeProperty.String,
      },
      {
        property: "ID_Tracking",
        operator: SqlOperator.IsNotNull,
        value: "",
        type: TypeProperty.String,
      },
    ]),
  );

export const getPhuongTienHanhTrinh = async <T = any,>(
  vehicleId: string | number,
  fromDate: string,
  toDate: string,
) =>
  callApi<T>(
    "POST",
    API_ENDPOINTS.GET_PHUONG_TIEN_HANH_TRINH,
    listRequest(trackingConditions(vehicleId, fromDate, toDate)),
  );

export const getPhuongTienHanhTrinhGps = async <T = any,>(
  journeyId: string | number,
) =>
  callApi<T>(
    "POST",
    API_ENDPOINTS.GET_PHUONG_TIEN_HANH_TRINH_GPS,
    listRequest([
      {
        property: "ID_HanhTrinh",
        operator: SqlOperator.Equals,
        value: journeyId,
        type: TypeProperty.Int,
      },
    ]),
  );

export const getPhuongTienTracking = async <T = any,>(
  vehicleId: string | number,
  fromDate: string,
  toDate: string,
) =>
  callApi<T>(
    "POST",
    API_ENDPOINTS.GET_PHUONG_TIEN_TRACKING,
    listRequest(trackingConditions(vehicleId, fromDate, toDate)),
  );

export const getPhuongTienCurrentLocation = async <T = any,>(
  trackingId: string,
) =>
  callApi<T>("POST", API_ENDPOINTS.GET_PHUONG_TIEN_CURRENT_LOCATION, {
    iD_Tracking: trackingId,
  });
