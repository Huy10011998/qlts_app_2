import React from "react";
import ReactTestRenderer from "react-test-renderer";

import { useWorkflowPagedList } from "../src/screens/Workflow/shared/useWorkflowPagedList";

type Hook = ReturnType<typeof useWorkflowPagedList<number>>;

// Nạp lại khi quay về màn (sau bình luận / duyệt...) phải im lặng: bật
// `refreshing` bằng code làm iOS đẩy danh sách xuống một khoảng trống.
describe("useWorkflowPagedList", () => {
  const setup = async () => {
    const fetchPage = jest.fn(async () => ({ items: [1, 2, 3], totalCount: 3 }));
    const states: Array<Pick<Hook, "refreshing" | "loading">> = [];
    let hook!: Hook;

    const Probe = () => {
      hook = useWorkflowPagedList<number>(fetchPage, { queryKey: "k" });
      states.push({ refreshing: hook.refreshing, loading: hook.loading });
      return null;
    };

    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(<Probe />);
    });

    return { fetchPage, states, getHook: () => hook };
  };

  it("reload không bật refreshing hay loading", async () => {
    const { fetchPage, states, getHook } = await setup();
    states.length = 0;

    await ReactTestRenderer.act(async () => {
      await getHook().reload();
    });

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(states.some((state) => state.refreshing || state.loading)).toBe(false);
    expect(getHook().items).toEqual([1, 2, 3]);
  });

  it("kéo để làm mới vẫn bật vòng xoay", async () => {
    const { fetchPage, getHook } = await setup();
    let release!: () => void;
    fetchPage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ items: [1], totalCount: 1 });
        }),
    );

    let pending!: Promise<void>;
    await ReactTestRenderer.act(async () => {
      pending = getHook().refresh();
    });
    expect(getHook().refreshing).toBe(true);

    await ReactTestRenderer.act(async () => {
      release();
      await pending;
    });
    expect(getHook().refreshing).toBe(false);
  });
});
