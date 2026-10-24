import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { Text, TouchableOpacity } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "../src/context/ThemeContext";
import HomeAttendanceCard from "../src/screens/Home/shared/HomeAttendanceCard";
import type { HomeDashboardDepartment } from "../src/screens/Home/shared/homeData";

const mountedTrees: ReactTestRenderer.ReactTestRenderer[] = [];

const mount = async (element: React.ReactElement) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <ThemeProvider>{element}</ThemeProvider>
      </SafeAreaProvider>,
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

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((node) =>
      Array.isArray(node.props.children)
        ? node.props.children.join("")
        : String(node.props.children ?? ""),
    );

const dept = (
  key: string,
  name: string,
  checkedIn: number,
  total: number,
): HomeDashboardDepartment => ({
  key,
  code: key,
  name,
  total,
  checkedIn,
  notCheckedIn: total - checkedIn,
});

// Thứ tự API (sttPrintRep) cố ý khác thứ tự theo tỉ lệ.
const DEPARTMENTS = [
  dept("KHXNK", "Phòng Kế hoạch", 97, 117),
  dept("KDND", "Phòng Kinh Doanh Nội Địa", 35, 409),
  dept("KT", "Phòng Kỹ Thuật", 125, 148),
  dept("TCKT", "Phòng Tài Chính - Kế Toán", 6, 11),
  dept("QTNS", "Phòng Quản Trị Nhân Sự", 83, 90),
  dept("XS1", "Xưởng Sauce 1", 300, 310),
  dept("XS2", "Xưởng Sauce 2", 200, 205),
];

const departmentNames = (labels: string[]) =>
  labels.filter((label) => DEPARTMENTS.some((item) => item.name === label));

describe("HomeAttendanceCard", () => {
  it("danh sách dài: hiện sẵn 5 bộ phận tỉ lệ thấp nhất, Xem tất cả mở đủ theo thứ tự API", async () => {
    const tree = await mount(
      <HomeAttendanceCard
        total={1290}
        checkedIn={846}
        notCheckedIn={444}
        departments={DEPARTMENTS}
      />,
    );
    let labels = texts(tree);

    expect(labels).toContain("BỘ PHẬN ĐIỂM DANH THẤP NHẤT");
    expect(departmentNames(labels)).toEqual([
      "Phòng Kinh Doanh Nội Địa",
      "Phòng Tài Chính - Kế Toán",
      "Phòng Kế hoạch",
      "Phòng Kỹ Thuật",
      "Phòng Quản Trị Nhân Sự",
    ]);
    // Tỉ lệ ghi thành chữ, làm tròn số nguyên.
    expect(labels).toContain("9%");
    expect(labels).toContain("Xem tất cả 7 bộ phận");

    const showAll = tree.root
      .findAllByType(TouchableOpacity)
      .find((node) =>
        node
          .findAllByType(Text)
          .some(
            (textNode) => textNode.props.children === "Xem tất cả 7 bộ phận",
          ),
      );

    await ReactTestRenderer.act(async () => {
      showAll!.props.onPress();
    });
    labels = texts(tree);

    expect(labels).toContain("TẤT CẢ 7 BỘ PHẬN");
    expect(departmentNames(labels)).toEqual(
      DEPARTMENTS.map((item) => item.name),
    );
    expect(labels).toContain("Thu gọn");
  });

  it("ít bộ phận thì hiện đủ như cũ, không có nút Xem tất cả", async () => {
    const tree = await mount(
      <HomeAttendanceCard
        total={526}
        checkedIn={132}
        notCheckedIn={394}
        departments={DEPARTMENTS.slice(0, 2)}
      />,
    );
    const labels = texts(tree);

    expect(departmentNames(labels)).toEqual([
      "Phòng Kế hoạch",
      "Phòng Kinh Doanh Nội Địa",
    ]);
    expect(labels.some((label) => label.startsWith("Xem tất cả"))).toBe(false);
    expect(labels).not.toContain("BỘ PHẬN ĐIỂM DANH THẤP NHẤT");
  });
});
