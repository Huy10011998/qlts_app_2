import React from "react";
import ReactTestRenderer from "react-test-renderer";

import {
  resetParentValueCache,
  useParentValuePairs,
} from "../src/hooks/parentValue/useParentValuePairs";
import { getParentValue } from "../src/services";

jest.mock("../src/services", () => ({
  getParentValue: jest.fn(),
}));

jest.mock("../src/utils/Logger", () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const mockedGetParentValue = jest.mocked(getParentValue);

type Result = ReturnType<typeof useParentValuePairs>;

const ROOM_PAIRS = {
  parentsFields: ["ID_Complex", "ID_Building", "ID_Unit", "ID_Room"],
  parentsValues: ["3", "14", "98", "8"],
};

const BASE_PARAMS = {
  idRoot: 8,
  nameClass: "BinhChuaChay",
  nameClassRoot: "Room",
  propertyReference: "ID_Room",
};

let mounted: ReactTestRenderer.ReactTestRenderer[] = [];

const renders: Result[] = [];

function Probe(params: Parameters<typeof useParentValuePairs>[0]) {
  renders.push(useParentValuePairs(params));
  return null;
}

const mount = async (params = BASE_PARAMS) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<Probe {...params} />);
  });

  mounted.push(tree!);
  return tree!;
};

const latest = () => renders[renders.length - 1];

beforeEach(() => {
  resetParentValueCache();
  renders.length = 0;
  mockedGetParentValue.mockReset();
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    mounted.forEach((tree) => tree.unmount());
  });
  mounted = [];
});

describe("useParentValuePairs", () => {
  it("lấy được bộ cặp thì dựng trọn bộ điều kiện", async () => {
    mockedGetParentValue.mockResolvedValue({ data: ROOM_PAIRS } as any);

    await mount();

    expect(latest().status).toBe("ready");
    expect(latest().conditions.map((item) => item.property)).toEqual([
      "ID_Complex",
      "ID_Building",
      "ID_Unit",
      "ID_Room",
    ]);
  });

  it("gửi body parent-value trên controller của class CHA", async () => {
    mockedGetParentValue.mockResolvedValue({ data: ROOM_PAIRS } as any);

    await mount();

    expect(mockedGetParentValue).toHaveBeenCalledWith(
      "Room",
      expect.objectContaining({
        ID_ParentClass: 8,
        Name_ParentClass: "Room",
        Name_ReferencesClass: "BinhChuaChay",
      }),
    );
  });

  /* Ca LinhKien: thiếu cặp phân loại là danh sách lẫn linh kiện của Server. */
  it("giữ cặp điều kiện phân loại của bộ cặp", async () => {
    mockedGetParentValue.mockResolvedValue({
      data: {
        parentsFields: ["ID_LoaiThietBiCNTT", "ID_ThietBiCNTT"],
        parentsValues: ["7", "1234"],
      },
    } as any);

    await mount({
      idRoot: 1234,
      nameClass: "LinhKien",
      nameClassRoot: "MayTinh",
      propertyReference: "ID_ThietBiCNTT",
    });

    expect(latest().conditions).toEqual([
      expect.objectContaining({ property: "ID_LoaiThietBiCNTT", value: "7" }),
      expect.objectContaining({ property: "ID_ThietBiCNTT", value: "1234" }),
    ]);
  });

  it("mount lần hai cùng key thì hit cache, chỉ 1 request và ready ngay", async () => {
    mockedGetParentValue.mockResolvedValue({ data: ROOM_PAIRS } as any);

    await mount();
    renders.length = 0;
    await mount();

    expect(mockedGetParentValue).toHaveBeenCalledTimes(1);
    // Render đầu của lượt hai đã ready — không nháy khung chờ.
    expect(renders[0].status).toBe("ready");
  });

  it("hai chỗ hỏi cùng lúc thì gộp thành 1 request", async () => {
    mockedGetParentValue.mockResolvedValue({ data: ROOM_PAIRS } as any);

    await ReactTestRenderer.act(async () => {
      mounted.push(
        ReactTestRenderer.create(
          <>
            <Probe {...BASE_PARAMS} />
            <Probe {...BASE_PARAMS} />
          </>,
        ),
      );
    });

    expect(mockedGetParentValue).toHaveBeenCalledTimes(1);
  });

  it("đổi dòng cha thì gọi lại", async () => {
    mockedGetParentValue.mockResolvedValue({ data: ROOM_PAIRS } as any);

    const tree = await mount();

    await ReactTestRenderer.act(async () => {
      tree.update(<Probe {...BASE_PARAMS} idRoot={9} />);
    });

    expect(mockedGetParentValue).toHaveBeenCalledTimes(2);
  });

  /* API lỗi thì vẫn phải cho gọi get-list bằng điều kiện kiểu cũ — không thì
     màn danh sách trắng. */
  it("lỗi API thì lùi về điều kiện đơn nhưng vẫn cho gọi danh sách", async () => {
    mockedGetParentValue.mockRejectedValue(new Error("500"));

    await mount();

    expect(latest().status).toBe("failed");
    expect(latest().isReady).toBe(true);
    expect(latest().conditions).toEqual([
      expect.objectContaining({ property: "ID_Room", value: "8" }),
    ]);
  });

  it("dữ liệu trả về không hợp lệ cũng coi là thất bại", async () => {
    mockedGetParentValue.mockResolvedValue({ data: null } as any);

    await mount();

    expect(latest().status).toBe("failed");
    expect(latest().conditions).toHaveLength(1);
  });

  // Luồng QR có `nameClassRoot` optional.
  it("thiếu nameClassRoot thì KHÔNG gọi API", async () => {
    await mount({ ...BASE_PARAMS, nameClassRoot: undefined } as any);

    expect(mockedGetParentValue).not.toHaveBeenCalled();
    expect(latest().status).toBe("skipped");
    expect(latest().isReady).toBe(true);
    expect(latest().conditions).toHaveLength(1);
  });

  it("enabled false thì KHÔNG gọi API", async () => {
    await mount({ ...BASE_PARAMS, enabled: false } as any);

    expect(mockedGetParentValue).not.toHaveBeenCalled();
    expect(latest().status).toBe("skipped");
  });

  /* Hợp đồng chặn get-list: đang tải thì nơi gọi phải chưa được fetch. */
  it("đang tải thì isReady false", async () => {
    mockedGetParentValue.mockReturnValue(new Promise(() => {}) as any);

    await mount();

    expect(latest().status).toBe("loading");
    expect(latest().isReady).toBe(false);
  });

  /* Bộ cặp là quan hệ cấu trúc nên cache không có TTL; kéo làm mới là đường
     duy nhất để nạp lại sau khi sửa cột cấp cha của bản ghi cha. */
  it("tăng reloadToken thì bỏ cache và hỏi lại", async () => {
    mockedGetParentValue.mockResolvedValue({ data: ROOM_PAIRS } as any);

    const tree = await mount();
    expect(mockedGetParentValue).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => {
      tree.update(<Probe {...BASE_PARAMS} reloadToken={1} />);
    });

    expect(mockedGetParentValue).toHaveBeenCalledTimes(2);
  });

  it("reloadToken không đổi thì vẫn dùng cache", async () => {
    mockedGetParentValue.mockResolvedValue({ data: ROOM_PAIRS } as any);

    const tree = await mount();

    await ReactTestRenderer.act(async () => {
      tree.update(<Probe {...BASE_PARAMS} reloadToken={0} />);
    });

    expect(mockedGetParentValue).toHaveBeenCalledTimes(1);
  });

  it("conditions giữ nguyên tham chiếu giữa các lần render", async () => {
    mockedGetParentValue.mockResolvedValue({ data: ROOM_PAIRS } as any);

    const tree = await mount();
    const before = latest().conditions;

    await ReactTestRenderer.act(async () => {
      tree.update(<Probe {...BASE_PARAMS} />);
    });

    expect(latest().conditions).toBe(before);
  });
});
