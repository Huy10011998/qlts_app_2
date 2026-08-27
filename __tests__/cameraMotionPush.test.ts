import {
  buildCameraMotionParams,
  getCameraMotionGroupId,
  isCameraMotionPush,
} from "../src/services/notifications/cameraPush";
import { normalizeRemoteMessage } from "../src/services/notifications/payload";
import { URGENT_CHANNEL_ID } from "../src/services/notifications/constants";

type RemoteMessageArg = Parameters<typeof normalizeRemoteMessage>[0];

const makeRemoteMessage = (
  partial: Partial<RemoteMessageArg>,
): RemoteMessageArg => partial as RemoteMessageArg;

/** Payload đúng như BE mô tả — mọi giá trị là chuỗi, kể cả số. */
const CAMERA_MOTION_DATA = {
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

describe("isCameraMotionPush", () => {
  it("nhận đúng thông báo chuyển động", () => {
    expect(isCameraMotionPush(CAMERA_MOTION_DATA)).toBe(true);
  });

  it("bỏ qua loại thông báo khác", () => {
    expect(isCameraMotionPush({ type: "asset", ID_Camera: "2568" })).toBe(false);
  });
});

describe("buildCameraMotionParams", () => {
  it("dựng params live view từ payload BE", () => {
    expect(buildCameraMotionParams(CAMERA_MOTION_DATA)).toEqual({
      zoneName: "Vòng ngoài sauce 3-Vp CBTP",
      cameras: [
        {
          iD_Camera: 2568,
          iD_Camera_Ma: "CAM0492",
          iD_Camera_MoTa: "CAM 24-CLF24",
        },
      ],
    });
  });

  it("dùng vùng camera khi BE bỏ trống vị trí", () => {
    const params = buildCameraMotionParams({
      ...CAMERA_MOTION_DATA,
      ViTri: "",
    });

    expect(params?.zoneName).toBe("BẢO VỆ - VÒNG NGOÀI TOÀN CÔNG TY");
  });

  it("trả null khi thiếu mã camera — không đủ để mở stream", () => {
    expect(
      buildCameraMotionParams({ ...CAMERA_MOTION_DATA, CameraMa: "" }),
    ).toBeNull();
  });

  it("trả null khi ID_Camera không phải số dương", () => {
    expect(
      buildCameraMotionParams({ ...CAMERA_MOTION_DATA, ID_Camera: "abc" }),
    ).toBeNull();
    expect(
      buildCameraMotionParams({ ...CAMERA_MOTION_DATA, ID_Camera: "0" }),
    ).toBeNull();
  });
});

describe("getCameraMotionGroupId", () => {
  it("gom thông báo theo từng camera", () => {
    expect(getCameraMotionGroupId(CAMERA_MOTION_DATA)).toBe(
      "CAMERA_MOTION:2568",
    );
  });

  it("không gom thông báo loại khác", () => {
    expect(getCameraMotionGroupId({ type: "asset" })).toBeUndefined();
  });
});

describe("normalizeRemoteMessage với noti camera", () => {
  it("đẩy lên channel ưu tiên cao dù BE không gửi channelId", () => {
    const message = normalizeRemoteMessage(
      makeRemoteMessage({
        messageId: "m-cam",
        notification: {
          title: "Phát hiện chuyển động - CAM 24-CLF24",
          body: "Vòng ngoài sauce 3-Vp CBTP",
        },
        data: CAMERA_MOTION_DATA,
      }),
    );

    expect(message.channelId).toBe(URGENT_CHANNEL_ID);
    expect(message.hasOsNotification).toBe(true);
  });
});
