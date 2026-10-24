jest.mock("../src/services/data/httpClient", () => ({ callApi: jest.fn() }));

import { callApi } from "../src/services/data/httpClient";
import {
  getSolarOverview,
  getSolarPowerFlow,
  getSolarSiteList,
  SolarApiError,
} from "../src/services/data/solarApi";

const callApiMock = callApi as jest.Mock;

// BE bọc số liệu dashboard thêm một lớp `{ data, ngayCapNhat }`. Đọc thiếu lớp
// này thì mọi khối đều ra "—" mà không báo lỗi (web vẫn có số).

describe("solarApi — lớp bọc của BE", () => {
  beforeEach(() => callApiMock.mockReset());

  it("bóc lớp { data, ngayCapNhat } của các API dashboard", async () => {
    const flow = { siteCurrentPowerFlow: { unit: "kW", PV: { currentPower: 12 } } };
    callApiMock.mockResolvedValue({
      message: "",
      data: { data: flow, ngayCapNhat: "2026-10-21T22:06:20+07:00" },
    });

    await expect(getSolarPowerFlow(17)).resolves.toEqual(flow);
  });

  it("vẫn nhận dạng cũ không có lớp bọc", async () => {
    const overview = { overview: { lastDayData: { energy: 1277259 } } };
    callApiMock.mockResolvedValue({ message: "", data: overview });

    await expect(getSolarOverview(17)).resolves.toEqual(overview);
  });

  it("danh sách site là mảng thẳng, không bóc", async () => {
    const sites = [{ iD_DongHoSolar: 17, siteName: "Vĩnh Lộc" }];
    callApiMock.mockResolvedValue({ message: "", data: sites });

    await expect(getSolarSiteList()).resolves.toEqual(sites);
  });

  it("lớp bọc rỗng → lỗi kèm message của BE", async () => {
    callApiMock.mockResolvedValue({
      message: "Chưa lấy được số liệu",
      data: { data: null, ngayCapNhat: null },
    });

    await expect(getSolarOverview(17)).rejects.toEqual(
      new SolarApiError("Chưa lấy được số liệu"),
    );
  });
});
