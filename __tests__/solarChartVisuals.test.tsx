import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { ThemeProvider } from "../src/context/ThemeContext";
import {
  areaChartMarkerX,
  AreaChart,
  BalanceBar,
  BarChart,
  ChartSkeleton,
  ChartTransition,
  DonutChart,
  EnergyBarChart,
  SceneView,
} from "../src/screens/Home/SolarPlantScreen.visuals";
import { getPlantScene } from "../src/screens/Home/shared/plantScenes";

// Các khối này chạy Animated (dashoffset donut, chiều rộng thanh tỉ trọng, mờ
// dần khi đổi bộ dữ liệu) nên lỗi thường chỉ nổ lúc mount chứ không phải lúc
// biên dịch. Test chỉ cần dựng được cây và đổi prop mà không văng.

const mountedTrees: ReactTestRenderer.ReactTestRenderer[] = [];

const mount = async (element: React.ReactElement) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>{element}</ThemeProvider>,
    );
  });

  mountedTrees.push(tree!);
  return tree!;
};

// Phải tháo cây ra: animation của khung chờ chạy vòng lặp vô hạn, còn mounted là
// còn timer chạy sau khi Jest đã dọn môi trường.
afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    mountedTrees.splice(0).forEach((tree) => tree.unmount());
  });
});

describe("biểu đồ điện mặt trời", () => {
  it("dựng được khung chờ ở cả trạng thái đang tải và không có dữ liệu", async () => {
    const tree = await mount(
      <ChartSkeleton height={220} isLoading message="Đang tải…" width={320} />,
    );

    await ReactTestRenderer.act(async () => {
      tree.update(
        <ThemeProvider>
          <ChartSkeleton
            height={220}
            message="Không có dữ liệu"
            width={320}
          />
        </ThemeProvider>,
      );
    });

    expect(tree.toJSON()).toBeTruthy();
  });

  it("đổi animationKey thì chạy lại chuyển cảnh mà không văng", async () => {
    const tree = await mount(
      <ChartTransition animationKey="Day-1">
        <DonutChart primaryColor="#1baf7a" secondaryColor="#eb6834" primaryPct={62} />
      </ChartTransition>,
    );

    await ReactTestRenderer.act(async () => {
      tree.update(
        <ThemeProvider>
          <ChartTransition animationKey="Month-2">
            <DonutChart
              primaryColor="#1baf7a"
              secondaryColor="#eb6834"
              primaryPct={0}
            />
          </ChartTransition>
        </ThemeProvider>,
      );
    });

    expect(tree.toJSON()).toBeTruthy();
  });

  it("thanh tỉ trọng chịu được cả hai phần bằng 0", async () => {
    const tree = await mount(
      <BalanceBar
        segments={[
          { fillStyle: null, percent: null },
          { fillStyle: null, percent: undefined },
        ]}
      />,
    );

    expect(tree.toJSON()).toBeTruthy();
  });

  it("biểu đồ vùng vẽ được chuỗi có lỗ trống", async () => {
    const tree = await mount(
      <AreaChart
        productionData={[0, 1.5, null, 3.2, 2.1]}
        consumptionData={[0.4, null, 1.1, 2.8, null]}
        selfData={[0, 1.2, 1.4, 2.6, 1.9]}
        markerIndex={3}
        width={320}
        height={180}
      />,
    );

    expect(tree.toJSON()).toBeTruthy();
  });

  it("giữ trục X trải hết cả ngày khi dữ liệu chỉ có nửa ngày", async () => {
    // 5 mốc dữ liệu trên trục 9 mốc: mốc cuối phải nằm ở giữa trục, không bị kéo
    // ra sát mép phải như khi trục chỉ tính phần đã có số.
    const width = 320;
    const half = areaChartMarkerX(width, 4, 9);
    const end = areaChartMarkerX(width, 8, 9);

    expect(half).toBeLessThan(end);
    expect(half - areaChartMarkerX(width, 0, 9)).toBeCloseTo(end - half, 5);

    const tree = await mount(
      <AreaChart
        productionData={[0, 1.5, 2.4, 3.2, 2.1]}
        consumptionData={[0.4, 0.9, 1.1, 2.8, 2.2]}
        domainCount={9}
        markerIndex={4}
        xLabels={[
          { label: "6", idx: 2 },
          { label: "Trưa", idx: 4 },
          { label: "18", idx: 6 },
        ]}
        width={width}
        height={180}
      />,
    );

    expect(tree.toJSON()).toBeTruthy();
  });

  it("biểu đồ cột năng lượng vẽ được cột xếp tầng, cột đè và mốc nhấn mạnh", async () => {
    const bucket = (label: string) => ({
      label,
      columns: [
        { stack: [{ color: "#2a78d6", value: 4 }] },
        {
          stack: [{ color: "#eb683499", value: 18 }],
          overlay: { color: "#1baf7a", value: 3 },
        },
      ],
    });

    const tree = await mount(
      <EnergyBarChart
        buckets={[bucket("1/8"), bucket("2/8"), bucket("3/8")]}
        markerIndex={2}
        unitLabel="MWh"
        width={320}
        height={180}
      />,
    );

    expect(tree.toJSON()).toBeTruthy();
  });

  it("biểu đồ cột năng lượng chịu được mốc toàn số 0", async () => {
    const tree = await mount(
      <EnergyBarChart
        buckets={[{ label: "1/8", columns: [{ stack: [{ color: "#2a78d6", value: 0 }] }] }]}
        markerIndex={0}
        width={320}
        height={180}
      />,
    );

    expect(tree.toJSON()).toBeTruthy();
  });

  it("khung cảnh nhà máy vẽ được cả khi có ảnh nền lẫn khi không", async () => {
    const drawn = await mount(<SceneView width={390} />);
    expect(drawn.toJSON()).toBeTruthy();

    const photo = await mount(
      <SceneView
        plantScene={getPlantScene("CHOLIMEX FOOD VĨNH LỘC")}
        width={390}
      />,
    );

    expect(photo.toJSON()).toBeTruthy();
  });

  it("biểu đồ cột chịu được danh sách rỗng", async () => {
    const tree = await mount(<BarChart data={[]} width={320} height={200} />);

    expect(tree.toJSON()).toBeTruthy();
  });
});
