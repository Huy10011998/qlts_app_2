import React from "react";
import ReactTestRenderer from "react-test-renderer";

let mockFocused = true;
let mockFocusEffect: (() => void) | null = null;

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ isFocused: () => mockFocused }),
  // Như bản thật: chạy khi đang focus, và chạy lại khi callback đổi lúc đang focus.
  useFocusEffect: (effect: () => void) =>
    require("react").useEffect(() => {
      mockFocusEffect = effect;
      if (mockFocused) effect();
    }, [effect]),
}));
jest.mock("../src/store/hooks", () => ({
  useAppSelector: (select: (state: unknown) => unknown) => select({ workflow: { version: 0 } }),
  useAppDispatch: () => jest.fn(),
}));

import { emitAppRefetch } from "../src/utils/AppRefetchBus";
import { useReloadOnWorkflowChange } from "../src/screens/Workflow/shared/useWorkflowVersion";

// BE / người khác đổi dữ liệu (thêm mình vào phiếu) không làm `version` đổi —
// màn Workflow phải tự nạp lại lúc app từ nền về.
describe("useReloadOnWorkflowChange khi app vào lại", () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
  const reload = jest.fn();

  const mount = async () => {
    const Probe = () => {
      useReloadOnWorkflowChange(reload);
      return null;
    };
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<Probe />);
    });
  };

  const focusAgain = async () => {
    mockFocused = true;
    await ReactTestRenderer.act(async () => {
      mockFocusEffect?.();
    });
  };

  beforeEach(() => {
    mockFocused = true;
    mockFocusEffect = null;
    reload.mockReset();
  });

  afterEach(async () => {
    await ReactTestRenderer.act(async () => {
      renderer?.unmount();
    });
    renderer = null;
  });

  it("lần focus đầu không nạp lại — màn tự nạp lúc mount", async () => {
    await mount();
    await focusAgain();

    expect(reload).not.toHaveBeenCalled();
  });

  it("màn đang hiện: nạp lại ngay khi app vào lại", async () => {
    await mount();
    await ReactTestRenderer.act(async () => {
      emitAppRefetch("foreground");
    });

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("màn nằm dưới stack: chờ tới lúc quay về mới nạp, và chỉ nạp một lần", async () => {
    await mount();
    mockFocused = false;
    await ReactTestRenderer.act(async () => {
      emitAppRefetch("foreground");
    });
    expect(reload).not.toHaveBeenCalled();

    await focusAgain();
    expect(reload).toHaveBeenCalledTimes(1);

    await focusAgain();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
