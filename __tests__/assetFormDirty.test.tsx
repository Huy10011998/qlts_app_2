import React from "react";
import ReactTestRenderer from "react-test-renderer";

import {
  hasAssetFormChanges,
  useAssetFormDirty,
} from "../src/components/assets/shared/useAssetFormDirty";

describe("hasAssetFormChanges", () => {
  it("coi undefined, null và chuỗi rỗng là cùng một giá trị trống", () => {
    expect(hasAssetFormChanges({ Ma: "" }, { Ma: null })).toBe(false);
    expect(hasAssetFormChanges({}, { Ma: "" })).toBe(false);
    expect(hasAssetFormChanges({ Ma: null }, {})).toBe(false);
  });

  // Số BE trả về và chuỗi gõ lại vào ô là một giá trị.
  it("không coi 5 và \"5\" là khác nhau", () => {
    expect(hasAssetFormChanges({ SoLuong: 5 }, { SoLuong: "5" })).toBe(false);
    expect(hasAssetFormChanges({ SoLuong: 5 }, { SoLuong: "6" })).toBe(true);
  });

  it("bỏ qua nhãn _MoTa tải về sau", () => {
    expect(
      hasAssetFormChanges(
        { ID_Phong: 3, ID_Phong_MoTa: "" },
        { ID_Phong: 3, ID_Phong_MoTa: "Phòng IT" },
      ),
    ).toBe(false);
  });

  it("nhận ra giá trị đổi, ô mới điền, ô bị xoá trắng", () => {
    expect(hasAssetFormChanges({ Ten: "A" }, { Ten: "B" })).toBe(true);
    expect(hasAssetFormChanges({}, { Ten: "B" })).toBe(true);
    expect(hasAssetFormChanges({ Ten: "A" }, { Ten: "" })).toBe(true);
    expect(hasAssetFormChanges({ Bat: false }, { Bat: true })).toBe(true);
  });

  it("so giá trị kiểu object theo nội dung", () => {
    expect(hasAssetFormChanges({ X: [1, 2] }, { X: [1, 2] })).toBe(false);
    expect(hasAssetFormChanges({ X: [1, 2] }, { X: [1, 3] })).toBe(true);
  });
});

type DirtyResult = ReturnType<typeof useAssetFormDirty>;

function Harness({
  formData,
  onRender,
}: {
  formData: Record<string, any>;
  onRender: (result: DirtyResult) => void;
}) {
  onRender(useAssetFormDirty(formData));
  return null;
}

describe("useAssetFormDirty", () => {
  const mount = async (formData: Record<string, any>) => {
    let latest: DirtyResult | undefined;
    let tree: ReactTestRenderer.ReactTestRenderer;
    const onRender = (result: DirtyResult) => {
      latest = result;
    };

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <Harness formData={formData} onRender={onRender} />,
      );
    });

    return {
      get result() {
        return latest!;
      },
      update: async (next: Record<string, any>) =>
        ReactTestRenderer.act(async () => {
          tree!.update(<Harness formData={next} onRender={onRender} />);
        }),
      act: async (fn: () => void) =>
        ReactTestRenderer.act(async () => {
          fn();
        }),
      unmount: async () =>
        ReactTestRenderer.act(async () => {
          tree!.unmount();
        }),
    };
  };

  // Form thêm mới tự điền mã tự tăng, giá trị mặc định... sau khi hiện — chưa
  // có cú sửa tay nào thì rời màn không phải hỏi.
  it("không dirty khi form chỉ đổi do code tự điền", async () => {
    const harness = await mount({});
    await harness.update({ Ma: "PC0016", TrangThai: 1 });

    expect(harness.result.isDirty).toBe(false);

    await harness.unmount();
  });

  it("lấy mốc ngay trước cú sửa tay đầu tiên", async () => {
    const harness = await mount({});
    await harness.update({ Ma: "PC0016" });

    // Người dùng gõ: nơi gọi đánh dấu trước rồi mới đổi form.
    await harness.act(() => harness.result.markUserEdit());
    await harness.update({ Ma: "PC0016", Ten: "Máy in" });
    expect(harness.result.isDirty).toBe(true);

    // Xoá lại đúng như lúc đầu thì hết "có thay đổi".
    await harness.act(() => harness.result.markUserEdit());
    await harness.update({ Ma: "PC0016", Ten: "" });
    expect(harness.result.isDirty).toBe(false);

    await harness.unmount();
  });
});
