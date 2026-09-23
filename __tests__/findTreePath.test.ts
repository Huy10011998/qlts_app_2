import { findTreePath } from "../src/components/menuTree/findTreePath";

type Node = { id: string | number; children?: Node[] };

const tree: Node[] = [
  {
    id: 177,
    children: [{ id: 1771 }, { id: 1772, children: [{ id: 17721 }] }],
  },
  { id: 67 },
];

describe("findTreePath", () => {
  it("trả về đường đi từ gốc tới nút, gồm cả nút đó", () => {
    expect(findTreePath(tree, 17721).map((node) => node.id)).toEqual([
      177, 1772, 17721,
    ]);
  });

  it("nhận id dạng chuỗi từ tham số điều hướng", () => {
    expect(findTreePath(tree, "67").map((node) => node.id)).toEqual([67]);
  });

  it("trả về mảng rỗng khi không có trong cây", () => {
    expect(findTreePath(tree, 999)).toEqual([]);
    expect(findTreePath(undefined, 177)).toEqual([]);
  });
});
