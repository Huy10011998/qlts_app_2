import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { getTokenViewCamera } from "../src/services/data/callApi";
import { useCameraViewToken } from "../src/components/camera/shared/useCameraViewToken";

jest.mock("../src/services/data/callApi", () => ({
  getTokenViewCamera: jest.fn(),
}));

jest.mock("../src/hooks/useNetworkAwareReload", () => ({
  useNetworkAwareReload: jest.fn(),
}));

jest.mock("../src/utils/Logger", () => ({
  warn: jest.fn(),
}));

const mockedGetTokenViewCamera = jest.mocked(getTokenViewCamera);

type HookResult = ReturnType<typeof useCameraViewToken>;

function Harness({
  isFocused,
  onRender,
}: {
  isFocused: boolean;
  onRender: (result: HookResult) => void;
}) {
  const result = useCameraViewToken({ isFocused });
  onRender(result);
  return null;
}

describe("useCameraViewToken", () => {
  it("applies an in-flight token when the camera screen regains focus", async () => {
    let resolveRequest: ((value: { data: string }) => void) | undefined;
    const request = new Promise<{ data: string }>((resolve) => {
      resolveRequest = resolve;
    });
    mockedGetTokenViewCamera.mockReturnValue(request as any);

    let latestResult: HookResult | undefined;
    const onRender = (result: HookResult) => {
      latestResult = result;
    };
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Harness isFocused onRender={onRender} />
      );
      await Promise.resolve();
    });

    let firstFetch: Promise<void>;
    await ReactTestRenderer.act(async () => {
      firstFetch = latestResult!.fetchCameraToken(true);
      await Promise.resolve();
    });

    await ReactTestRenderer.act(async () => {
      renderer.update(<Harness isFocused={false} onRender={onRender} />);
      renderer.update(<Harness isFocused onRender={onRender} />);
      await Promise.resolve();
    });

    let refocusFetch: Promise<void>;
    await ReactTestRenderer.act(async () => {
      refocusFetch = latestResult!.fetchCameraToken(true);
      resolveRequest?.({ data: "camera-token" });
      await Promise.all([firstFetch!, refocusFetch!]);
    });

    expect(mockedGetTokenViewCamera).toHaveBeenCalledTimes(1);
    expect(latestResult?.cameraToken).toBe("camera-token");
    expect(latestResult?.thumbTimestamp).toBeGreaterThan(0);
  });
});
