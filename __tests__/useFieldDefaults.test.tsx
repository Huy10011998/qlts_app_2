import React from "react";
import ReactTestRenderer from "react-test-renderer";

import { useFieldDefaults } from "../src/hooks/AssetAddItem/useFieldDefaults";
import { TypeProperty } from "../src/utils/Enum";

let mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    mounted.forEach((tree) => tree.unmount());
  });
  mounted = [];
});

const FIELDS = [
  {
    name: "ID_TienTe",
    typeProperty: TypeProperty.Reference,
    defaultValue: "1",
  },
  {
    name: "ID_LoaiThietBiCNTT",
    typeProperty: TypeProperty.Int,
    defaultValue: "5",
  },
] as any[];

/** Bọc hook lại để test đọc được `formData` sau mỗi lần render. */
const mountHook = async (fields: any[], initial: Record<string, any> = {}) => {
  const seen: Array<Record<string, any>> = [];
  let setFields: (next: any[]) => void = () => {};
  let setForm: React.Dispatch<React.SetStateAction<Record<string, any>>> =
    () => {};

  function Probe() {
    const [fieldActive, setFieldActive] = React.useState(fields);
    const [formData, setFormData] = React.useState(initial);

    setFields = setFieldActive;
    setForm = setFormData;
    seen.push(formData);

    useFieldDefaults(fieldActive, setFormData);

    return null;
  }

  await ReactTestRenderer.act(async () => {
    mounted.push(ReactTestRenderer.create(<Probe />));
  });

  return {
    get formData() {
      return seen[seen.length - 1];
    },
    setFields: async (next: any[]) => {
      await ReactTestRenderer.act(async () => setFields(next));
    },
    setForm: async (next: Record<string, any>) => {
      await ReactTestRenderer.act(async () => setForm(next));
    },
  };
};

describe("useFieldDefaults", () => {
  it("điền default cho field còn trống", async () => {
    const hook = await mountHook(FIELDS);

    expect(hook.formData).toEqual({ ID_TienTe: 1, ID_LoaiThietBiCNTT: 5 });
  });

  /* Thứ tự áp: default TRƯỚC, parent-value ghi đè. `useLoadParentValue` spread
     `...nextFormValues` nên chiều này đã đúng sẵn. */
  it("parent-value về sau thì ghi đè được default", async () => {
    const hook = await mountHook(FIELDS);

    await hook.setForm({ ...hook.formData, ID_TienTe: 9 });

    expect(hook.formData.ID_TienTe).toBe(9);
  });

  /* Chiều ngược: parent-value về TRƯỚC (getFieldActive và getParentValue là hai
     request độc lập). Guard cũ `!next[name]` là truthy check nên giá trị 0 bị
     coi là trống và default ghi đè lên — đúng ca này. */
  it("parent-value về trước thì default KHÔNG ghi đè, kể cả giá trị 0", async () => {
    const hook = await mountHook([], { ID_TienTe: 0, ID_LoaiThietBiCNTT: "" });

    await hook.setFields(FIELDS);

    expect(hook.formData.ID_TienTe).toBe(0);
    expect(hook.formData.ID_LoaiThietBiCNTT).toBe("");
  });

  /* `fieldActive` đổi tham chiếu (refetch, đổi tab) không được điền lại vào ô
     người dùng đã xoá trắng hoặc cascade vừa clear về null. */
  it("không điền lại field đã áp một lần", async () => {
    const hook = await mountHook(FIELDS);

    await hook.setForm({ ID_TienTe: null, ID_LoaiThietBiCNTT: null });
    await hook.setFields([...FIELDS]);

    expect(hook.formData.ID_TienTe).toBeNull();
  });

  it("không field nào có default thì không tạo render vô ích", async () => {
    const hook = await mountHook([
      { name: "Ten", typeProperty: TypeProperty.String, defaultValue: "abc" },
    ] as any[]);

    expect(hook.formData).toEqual({});
  });

  it("fieldActive rỗng thì không làm gì", async () => {
    const hook = await mountHook([]);

    expect(hook.formData).toEqual({});
  });
});
