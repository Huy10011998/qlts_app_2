import React from "react";
import { Text } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import CongViecCard from "../src/screens/Workflow/CongViec/components/CongViecCard";
import FlowCard from "../src/screens/Workflow/Flow/components/FlowCard";
import WorkflowCounter from "../src/screens/Workflow/shared/components/WorkflowCounter";
import WorkflowListSkeleton, {
  CounterPendingPills,
  countFieldLines,
  FlowStepPendingRow,
  getWorkflowCardSkeletonHeight,
  useInfoPending,
} from "../src/screens/Workflow/shared/components/WorkflowListSkeleton";
import type { WorkflowField } from "../src/screens/Workflow/shared/workflowFields";
import type { CongViecItem } from "../src/types/index";
import { TypeProperty } from "../src/utils/Enum";

// Vòng nhấp nháy chỉ dừng khi unmount; còn sống thì Jest không thoát được.
let mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    mounted.forEach((tree) => tree.unmount());
  });
  mounted = [];
});

const mount = async (element: React.ReactElement) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });

  mounted.push(tree!);

  return tree!;
};

const countByName = (tree: ReactTestRenderer.ReactTestRenderer, name: string) =>
  tree.root.findAll(
    (node) => typeof node.type === "function" && node.type.name === name,
  ).length;

const layout = async (tree: ReactTestRenderer.ReactTestRenderer, height: number) => {
  const wrap = tree.root.findAllByProps({ accessibilityLabel: "Đang tải danh sách" })[0];

  await ReactTestRenderer.act(async () => {
    wrap.props.onLayout({ nativeEvent: { layout: { height } } });
  });
};

const textsOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .flatMap((node) => ([] as unknown[]).concat(node.props.children))
    .filter((child): child is string => typeof child === "string");

describe("chiều cao thẻ chờ Workflow", () => {
  it("phiếu có dòng bước hiện tại thì thẻ cao hơn", () => {
    expect(getWorkflowCardSkeletonHeight("flow", { step: true })).toBeGreaterThan(
      getWorkflowCardSkeletonHeight("flow", { step: false }),
    );
  });

  it("nhiều dòng field thì thẻ cao hơn", () => {
    for (const kind of ["flow", "congViec", "keHoach"] as const) {
      expect(getWorkflowCardSkeletonHeight(kind, { lines: 4 })).toBeGreaterThan(
        getWorkflowCardSkeletonHeight(kind, { lines: 1 }),
      );
    }
  });

  // Thẻ kế hoạch cao theo cột nào dài hơn: ít chữ thì vòng tiến độ giữ chiều cao.
  it("kế hoạch ít chữ vẫn cao ít nhất bằng cột vòng tiến độ", () => {
    expect(
      getWorkflowCardSkeletonHeight("keHoach", { code: false, title: false, lines: 0 }),
    ).toBeGreaterThanOrEqual(48 + 12 * 2 + 10);
  });

  // Thẻ Workflow cao 115–165, không phải 84 của thẻ tài sản.
  it("dòng việc cần xử lý thấp hơn mọi thẻ Workflow", () => {
    const viec = getWorkflowCardSkeletonHeight("viec");

    for (const kind of ["flow", "congViec", "keHoach"] as const) {
      expect(getWorkflowCardSkeletonHeight(kind)).toBeGreaterThan(viec);
    }
  });

  it("field ảnh không tính là dòng chữ", () => {
    const field = (name: string, typeProperty: number) =>
      ({ name, typeProperty }) as unknown as WorkflowField;

    expect(
      countFieldLines([
        field("NgayTao", TypeProperty.Text),
        field("Anh", TypeProperty.Image),
        field("QR", TypeProperty.ImageBase64),
      ]),
    ).toBe(1);
  });
});

describe("khung chờ danh sách Workflow", () => {
  it("dựng đủ thẻ để phủ kín chiều cao khung", async () => {
    const tree = await mount(<WorkflowListSkeleton kind="congViec" />);

    await layout(tree, 900);

    expect(countByName(tree, "CongViecCardSkeleton")).toBe(
      Math.ceil(900 / getWorkflowCardSkeletonHeight("congViec")),
    );
  });

  it("dòng thấp hơn thì dựng được nhiều dòng hơn trong cùng khung", async () => {
    const viec = await mount(<WorkflowListSkeleton kind="viec" />);
    const flow = await mount(<WorkflowListSkeleton kind="flow" shape={{ step: true }} />);

    await layout(viec, 900);
    await layout(flow, 900);

    expect(countByName(viec, "ViecRowSkeleton")).toBeGreaterThan(
      countByName(flow, "FlowCardSkeleton"),
    );
  });

  // Hàng "Duyệt nhiều (n)" thật chỉ hiện sau trang đầu — khung chờ giữ chỗ nó.
  it("giữ chỗ hàng Duyệt nhiều chỉ khi được yêu cầu", async () => {
    const withRow = await mount(<WorkflowListSkeleton kind="flow" hasApproveAllRow rows={1} />);
    const withoutRow = await mount(<WorkflowListSkeleton kind="flow" rows={1} />);

    expect(countByName(withRow, "ApproveAllRow")).toBe(1);
    expect(countByName(withoutRow, "ApproveAllRow")).toBe(0);
  });
});

describe("thẻ giữ chỗ thông tin phụ", () => {
  const congViec = { id: 1, trangThai: 0, chuTri_MoTa: "Nhân viên Test 1" } as CongViecItem;
  const cvInfo = { id: 1, soBinhLuan: 2, soFile: 1 } as any;

  // cv-thong-tin về SAU trang danh sách; giữ chỗ chân thẻ thì thẻ khỏi dài ra.
  it("công việc: đang chờ cv-thong-tin thì chân thẻ là hai viên chờ", async () => {
    const pending = await mount(
      <CongViecCard item={congViec} fields={[]} infoPending onPress={() => undefined} />,
    );

    expect(countByName(pending, "CounterPendingPills")).toBe(1);
    expect(pending.root.findAllByType(WorkflowCounter)).toHaveLength(0);
  });

  it("công việc: thông tin về thì viên thật thay vào", async () => {
    const loaded = await mount(
      <CongViecCard item={congViec} fields={[]} info={cvInfo} infoPending onPress={() => undefined} />,
    );

    expect(loaded.root.findAllByType(CounterPendingPills)).toHaveLength(0);
    expect(loaded.root.findAllByType(WorkflowCounter)).toHaveLength(2);
  });

  it("công việc: có onOpenLichSu thì thêm viên Lịch sử, kể cả lúc chờ cv-thong-tin", async () => {
    const pending = await mount(
      <CongViecCard
        item={congViec}
        fields={[]}
        infoPending
        onPress={() => undefined}
        onOpenLichSu={() => undefined}
      />,
    );
    expect(countByName(pending, "CounterPendingPills")).toBe(1);
    expect(
      pending.root.findAllByType(WorkflowCounter).map((node) => node.props.label),
    ).toEqual(["Lịch sử"]);

    const loaded = await mount(
      <CongViecCard
        item={congViec}
        fields={[]}
        info={cvInfo}
        onPress={() => undefined}
        onOpenLichSu={() => undefined}
      />,
    );
    expect(
      loaded.root.findAllByType(WorkflowCounter).map((node) => node.props.label),
    ).toEqual(["Bình luận", "Đính kèm", "Lịch sử"]);
  });

  // Lượt gọi hỏng: không còn chờ mà vẫn không có thông tin — không nhấp nháy mãi.
  it("công việc: hết chờ mà không có thông tin thì không giữ chỗ", async () => {
    const failed = await mount(
      <CongViecCard item={congViec} fields={[]} onPress={() => undefined} />,
    );

    expect(failed.root.findAllByType(CounterPendingPills)).toHaveLength(0);
    expect(failed.root.findAllByType(WorkflowCounter)).toHaveLength(0);
  });

  const flowCard = (item: Record<string, unknown>, props: Partial<React.ComponentProps<typeof FlowCard>>) => (
    <FlowCard
      item={{ id: 7, ...item }}
      fields={[]}
      soPhieuField={null}
      onPress={() => undefined}
      {...props}
    />
  );

  it("phiếu đang chạy quy trình giữ chỗ dòng bước hiện tại", async () => {
    const choDuyet = await mount(flowCard({ TinhTrang: 1 }, { infoPending: true }));

    expect(choDuyet.root.findAllByType(FlowStepPendingRow)).toHaveLength(1);
  });

  // Nháp chưa vào quy trình — giữ chỗ là thẻ co lại lúc thông tin về.
  it("phiếu nháp không giữ chỗ dòng bước", async () => {
    const nhap = await mount(flowCard({ TinhTrang: 0 }, { infoPending: true }));

    expect(nhap.root.findAllByType(FlowStepPendingRow)).toHaveLength(0);
  });

  it("thông tin về thì dòng bước thật thay vào", async () => {
    const loaded = await mount(
      flowCard(
        { TinhTrang: 2 },
        {
          infoPending: true,
          info: { iD_HoSo: 7, soBinhLuan: 0, soFile: 0, soBuoc: 2, isToiLuot: false, buocHienTai: "1. Trưởng bộ phận duyệt" },
        },
      ),
    );

    expect(loaded.root.findAllByType(FlowStepPendingRow)).toHaveLength(0);
    expect(textsOf(loaded)).toContain("1. Trưởng bộ phận duyệt");
  });
});

describe("useInfoPending", () => {
  let latest: ReturnType<typeof useInfoPending>;

  function Probe() {
    latest = useInfoPending();
    return null;
  }

  const deferred = () => {
    let resolve!: () => void;
    let reject!: (err: Error) => void;
    const promise = new Promise<void>((ok, fail) => {
      resolve = ok;
      reject = fail;
    });
    return { promise, resolve, reject };
  };

  it("đánh dấu chờ tới khi lượt gọi xong, kể cả lượt hỏng", async () => {
    await mount(<Probe />);
    const ok = deferred();
    const fail = deferred();

    await ReactTestRenderer.act(async () => {
      latest.track([1, 2], ok.promise);
      latest.track([3], fail.promise);
    });
    expect([...latest.pendingIds].sort()).toEqual([1, 2, 3]);

    await ReactTestRenderer.act(async () => {
      ok.resolve();
      fail.reject(new Error("mất mạng"));
    });
    expect(latest.pendingIds.size).toBe(0);
  });
});
