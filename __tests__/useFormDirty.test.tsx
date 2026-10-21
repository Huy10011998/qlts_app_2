import React, { useState } from "react";
import ReactTestRenderer from "react-test-renderer";

import { useFormDirty } from "../src/screens/Workflow/shared/useFormDirty";

type Probe = {
  isDirty: boolean;
  change: (next: string) => void;
  /** Effect của form tự điền giá trị (không qua người dùng). */
  autofill: (next: string) => void;
  markSaved: () => void;
};

// Form công việc / phiếu / kế hoạch hỏi "Bỏ thay đổi?" theo cờ này: mốc so sánh
// lấy lúc người dùng chạm lần đầu, nên giá trị form tự điền sau khi mở không
// làm form thành "có thay đổi".
describe("useFormDirty", () => {
  const setup = async () => {
    let probe!: Probe;
    const Form = () => {
      const [value, setValue] = useState("a");
      const { isDirty, markTouched, markSaved } = useFormDirty(JSON.stringify(value));
      probe = {
        isDirty,
        change: (next) => {
          markTouched();
          setValue(next);
        },
        autofill: setValue,
        markSaved,
      };
      return null;
    };
    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(<Form />);
    });
    return () => probe;
  };

  it("tự điền trước khi chạm không tính là thay đổi", async () => {
    const get = await setup();
    await ReactTestRenderer.act(async () => get().autofill("b"));
    expect(get().isDirty).toBe(false);
  });

  it("sửa thì dirty, trả lại như lúc trước khi sửa thì hết", async () => {
    const get = await setup();
    await ReactTestRenderer.act(async () => get().autofill("b"));
    await ReactTestRenderer.act(async () => get().change("c"));
    expect(get().isDirty).toBe(true);
    await ReactTestRenderer.act(async () => get().change("b"));
    expect(get().isDirty).toBe(false);
  });

  it("lưu xong thì giá trị hiện tại thành mốc mới", async () => {
    const get = await setup();
    await ReactTestRenderer.act(async () => get().change("c"));
    expect(get().isDirty).toBe(true);
    await ReactTestRenderer.act(async () => get().markSaved());
    expect(get().isDirty).toBe(false);
    await ReactTestRenderer.act(async () => get().change("d"));
    expect(get().isDirty).toBe(true);
  });
});
