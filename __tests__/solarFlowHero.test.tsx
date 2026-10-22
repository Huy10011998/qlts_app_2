import React from "react";
import ReactTestRenderer from "react-test-renderer";
import {
  getFlowHeroHeight,
  SolarFlowHero,
} from "../src/screens/Home/SolarPlantScreen.flowHero";
import { getSkyKind } from "../src/screens/Home/SolarPlantScreen.flowWeather";
import type { PlantWeatherState } from "../src/screens/Home/SolarPlantScreen.helpers";

const GRID_ARROW_IN = "718,889.5 718,917.5 696,903.5";
const GRID_ARROW_OUT = "852,889.5 852,917.5 874,903.5";

const baseProps = {
  gridLabel: "Mua từ lưới",
  gridPower: { value: "84.2", unit: "kW" },
  gridWatt: 84200,
  isExportingToGrid: false,
  loadPower: { value: "224.5", unit: "kW" },
  pvPower: { value: "140.3", unit: "kW" },
  todayEnergy: { value: "665", unit: "kWh" },
  weather: {
    isLoading: false,
    temperature: 32,
    weatherCode: 95,
  } as PlantWeatherState,
  width: 390,
};

const weatherOf = (weatherCode: number, isDay = true): PlantWeatherState => ({
  isDay,
  isLoading: false,
  temperature: 31,
  weatherCode,
});

const mountedTrees: ReactTestRenderer.ReactTestRenderer[] = [];

const mount = async (props: Partial<typeof baseProps> = {}) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SolarFlowHero {...baseProps} {...props} />,
    );
  });

  mountedTrees.push(tree!);
  return tree!;
};

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    mountedTrees.splice(0).forEach((tree) => tree.unmount());
  });
});

const countByProp = (
  tree: ReactTestRenderer.ReactTestRenderer,
  prop: string,
  value: unknown,
) =>
  tree.root.findAll(
    (node) => typeof node.type !== "string" && node.props[prop] === value,
  ).length;

const textContent = (tree: ReactTestRenderer.ReactTestRenderer) =>
  JSON.stringify(tree.toJSON());

/** Số lớp hiệu ứng theo tên component (RainLayer, DriftingCloud, …). */
const countLayers = (tree: ReactTestRenderer.ReactTestRenderer, name: string) =>
  tree.root.findAll(
    (node) => typeof node.type === "function" && node.type.name === name,
  ).length;

describe("hero dòng năng lượng điện mặt trời", () => {
  it("cao theo tỉ lệ ảnh mẫu, màn rộng thì dừng ở bề ngang tối đa", () => {
    expect(getFlowHeroHeight(390)).toBe(Math.round((390 * 1007) / 1182));
    expect(getFlowHeroHeight(800)).toBe(getFlowHeroHeight(520));
  });

  it("hiện đủ số liệu và nhãn tiếng Việt", async () => {
    const tree = await mount();
    const text = textContent(tree);

    for (const value of ["665", "224.5", "140.3", "84.2", "32 °C"]) {
      expect(text).toContain(value);
    }
    expect(text).toContain("Nhà máy");
    expect(text).toContain("Mua từ lưới");
  });

  it("gom mã WMO thành bảy kiểu trời", () => {
    expect(getSkyKind(undefined)).toBe("partly");
    expect(getSkyKind(0)).toBe("sunny");
    expect(getSkyKind(2)).toBe("partly");
    expect(getSkyKind(3)).toBe("overcast");
    expect(getSkyKind(45)).toBe("fog");
    expect(getSkyKind(53)).toBe("drizzle");
    expect(getSkyKind(63)).toBe("rain");
    expect(getSkyKind(81)).toBe("rain");
    expect(getSkyKind(95)).toBe("storm");
    expect(getSkyKind(73)).toBe("overcast");
  });

  it("mưa: hai lớp mưa rơi, không nắng", async () => {
    const tree = await mount({ weather: weatherOf(63) });

    expect(countLayers(tree, "RainLayer")).toBe(2);
    expect(countLayers(tree, "SunBeams")).toBe(0);
    expect(countLayers(tree, "PanelSparkles")).toBe(0);
  });

  it("nắng: tia nắng, pin lấp lánh, không mưa", async () => {
    const tree = await mount({ weather: weatherOf(0) });

    expect(countLayers(tree, "SunBeams")).toBe(1);
    expect(countLayers(tree, "PanelSparkles")).toBe(1);
    expect(countLayers(tree, "RainLayer")).toBe(0);
  });

  it("dông: mưa nặng hạt kèm hai tia sét", async () => {
    const tree = await mount({ weather: weatherOf(95) });

    expect(countLayers(tree, "RainLayer")).toBe(2);
    expect(countByProp(tree, "fill", "#FFF6C4")).toBeGreaterThan(0);
  });

  it("ít mây / âm u: mây trôi, sương mù: dải sương", async () => {
    const partly = await mount({ weather: weatherOf(2) });
    expect(countLayers(partly, "DriftingCloud")).toBe(3);

    const overcast = await mount({ weather: weatherOf(3) });
    expect(countLayers(overcast, "DriftingCloud")).toBe(4);

    const fog = await mount({ weather: weatherOf(45) });
    expect(countLayers(fog, "FogBand")).toBe(3);
    expect(countLayers(fog, "RainLayer")).toBe(0);
  });

  it("ban đêm: sao thay tia nắng, chữ phía trên chuyển sáng", async () => {
    const tree = await mount({ weather: weatherOf(0, false) });

    expect(countLayers(tree, "NightStars")).toBe(1);
    expect(countLayers(tree, "SunBeams")).toBe(0);
    expect(textContent(tree)).toContain("#F2F6FF");
  });

  it("đang mua điện lưới: mũi tên lưới chĩa vào tủ, dây vào nhà máy xen cam", async () => {
    const tree = await mount();

    expect(countByProp(tree, "points", GRID_ARROW_IN)).toBeGreaterThan(0);
    expect(countByProp(tree, "points", GRID_ARROW_OUT)).toBe(0);
    expect(countByProp(tree, "strokeDasharray", "17 19")).toBeGreaterThan(0);
  });

  it("đang bán lên lưới: mũi tên đổi chiều ra cột điện, dây vào nhà máy toàn xanh", async () => {
    const tree = await mount({
      gridLabel: "Bán lên lưới",
      isExportingToGrid: true,
    });

    expect(countByProp(tree, "points", GRID_ARROW_OUT)).toBeGreaterThan(0);
    expect(countByProp(tree, "points", GRID_ARROW_IN)).toBe(0);
    expect(countByProp(tree, "strokeDasharray", "17 19")).toBe(0);
    expect(textContent(tree)).toContain("Bán lên lưới");
  });

  it("chưa có nhiệt độ thì ẩn biểu tượng thời tiết, hiện gạch ngang", async () => {
    const tree = await mount({
      weather: {
        isLoading: true,
        temperature: null as unknown as number,
        weatherCode: 95,
      },
    });

    expect(textContent(tree)).toContain("— °C");
    expect(countByProp(tree, "fill", "#F89B12")).toBe(0);
  });
});
