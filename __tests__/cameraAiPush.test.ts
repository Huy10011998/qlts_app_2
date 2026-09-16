import {
  buildCameraAiParams,
  getCameraAiGroupId,
  isCameraAiPush,
} from "../src/services/notifications/cameraPush";
import { normalizeRemoteMessage } from "../src/services/notifications/payload";
import { URGENT_CHANNEL_ID } from "../src/services/notifications/constants";

type RemoteMessageArg = Parameters<typeof normalizeRemoteMessage>[0];

const makeRemoteMessage = (
  partial: Partial<RemoteMessageArg>,
): RemoteMessageArg => partial as RemoteMessageArg;

/** Payload đúng như BE mô tả (bản 16/09/2026) — mọi giá trị là chuỗi, kể cả số. */
const CAMERA_AI_DATA = {
  type: "CAMERA_AI",
  ID_Camera: "2568",
  CameraMa: "CAM0492",
  CameraTen: "CAM 24-CLF24",
  ViTri: "Vòng ngoài sauce 3-Vp CBTP",
  VungCamera: "BẢO VỆ - VÒNG NGOÀI TOÀN CÔNG TY",
  EventType: "DETECT",
  DoTinCay: "0.91",
  GhiChu: "2 người",
  ThoiGian: "2026-09-16 09:13:58",
};

/** Payload bản 27/08/2026 — còn gặp khi server chưa deploy bản mới. */
const LEGACY_MOTION_DATA = {
  type: "CAMERA_MOTION",
  ID_Camera: "2568",
  CameraMa: "CAM0492",
  CameraTen: "CAM 24-CLF24",
  ViTri: "Vòng ngoài sauce 3-Vp CBTP",
  VungCamera: "BẢO VỆ - VÒNG NGOÀI TOÀN CÔNG TY",
  ID_DauGhi: "1046",
  Kenh: "8",
  EventType: "VMD",
  ThoiGian: "2026-08-27 09:13:58",
};

describe("isCameraAiPush", () => {
  it("nhận đúng thông báo AI phát hiện", () => {
    expect(isCameraAiPush(CAMERA_AI_DATA)).toBe(true);
  });

  it("vẫn nhận payload legacy CAMERA_MOTION", () => {
    expect(isCameraAiPush(LEGACY_MOTION_DATA)).toBe(true);
  });

  it("bỏ qua loại thông báo khác", () => {
    expect(isCameraAiPush({ type: "asset", ID_Camera: "2568" })).toBe(false);
  });
});

describe("buildCameraAiParams", () => {
  it("dựng params live view từ payload BE", () => {
    expect(buildCameraAiParams(CAMERA_AI_DATA)).toEqual({
      zoneName: "Vòng ngoài sauce 3-Vp CBTP",
      layoutCount: 1,
      cameras: [
        {
          iD_Camera: 2568,
          iD_Camera_Ma: "CAM0492",
          iD_Camera_MoTa: "CAM 24-CLF24",
        },
      ],
    });
  });

  it("không phụ thuộc EventType — 3 loại sự kiện mở live view như nhau", () => {
    const detect = buildCameraAiParams(CAMERA_AI_DATA);

    expect(
      buildCameraAiParams({ ...CAMERA_AI_DATA, EventType: "FIRE_SMOKE" }),
    ).toEqual(detect);
    expect(
      buildCameraAiParams({ ...CAMERA_AI_DATA, EventType: "SMOKING" }),
    ).toEqual(detect);
  });

  it("dùng vùng camera khi BE bỏ trống vị trí", () => {
    const params = buildCameraAiParams({
      ...CAMERA_AI_DATA,
      ViTri: "",
    });

    expect(params?.zoneName).toBe("BẢO VỆ - VÒNG NGOÀI TOÀN CÔNG TY");
  });

  it("trả null khi thiếu mã camera — không đủ để mở stream", () => {
    expect(buildCameraAiParams({ ...CAMERA_AI_DATA, CameraMa: "" })).toBeNull();
  });

  it("trả null khi ID_Camera không phải số dương", () => {
    expect(
      buildCameraAiParams({ ...CAMERA_AI_DATA, ID_Camera: "abc" }),
    ).toBeNull();
    expect(buildCameraAiParams({ ...CAMERA_AI_DATA, ID_Camera: "0" })).toBeNull();
  });
});

describe("getCameraAiGroupId", () => {
  it("gom thông báo theo từng camera", () => {
    expect(getCameraAiGroupId(CAMERA_AI_DATA)).toBe("CAMERA_AI:2568");
  });

  it("gom payload legacy chung nhóm với payload mới", () => {
    expect(getCameraAiGroupId(LEGACY_MOTION_DATA)).toBe("CAMERA_AI:2568");
  });

  it("không gom thông báo loại khác", () => {
    expect(getCameraAiGroupId({ type: "asset" })).toBeUndefined();
  });
});

describe("normalizeRemoteMessage với noti camera", () => {
  it("đẩy lên channel ưu tiên cao dù BE không gửi channelId", () => {
    const message = normalizeRemoteMessage(
      makeRemoteMessage({
        messageId: "m-cam",
        notification: {
          title: "Phát hiện đối tượng - CAM 24-CLF24",
          body: "Vòng ngoài sauce 3-Vp CBTP",
        },
        data: CAMERA_AI_DATA,
      }),
    );

    expect(message.channelId).toBe(URGENT_CHANNEL_ID);
    expect(message.hasOsNotification).toBe(true);
  });
});
