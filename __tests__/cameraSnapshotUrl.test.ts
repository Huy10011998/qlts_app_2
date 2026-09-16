import {
  getCameraFullscreenSnapshotUrl,
  getCameraHlsUrl,
  getCameraSnapshotUrl,
} from "../src/components/camera/shared/cameraStreamUtils";

// URLSearchParams của React Native thiếu `get` trong type, nên đọc thẳng query.
const sourceOf = (url: string) => url.match(/[?&]src=([^&]+)/)?.[1] ?? "";

describe("URL ảnh snapshot camera", () => {
  it("thumbnail danh sách/lưới lấy luồng phụ cho nhẹ", () => {
    expect(sourceOf(getCameraSnapshotUrl("LACAM28", 123))).toBe(
      "LACAM28_snap",
    );
  });

  it("giữ nguyên query phụ của thumbnail khi đổi nguồn", () => {
    const url = getCameraSnapshotUrl("LACAM28", 123, "&rk=2&rt=1");
    expect(url).toContain("&rk=2&rt=1");
    expect(url).toContain("t=123");
  });

  it("ảnh chờ fullscreen lấy đúng luồng mà video fullscreen phát", () => {
    // Cùng nguồn thì cùng tỷ lệ khung hình, nên ảnh chờ không hụt hai bên rồi
    // "nhảy" ra full lúc video hiện lên.
    const snapshotSource = sourceOf(
      getCameraFullscreenSnapshotUrl("LACAM28", 123),
    );
    const streamSource = sourceOf(getCameraHlsUrl("LACAM28"));

    expect(snapshotSource).toBe("LACAM28_main");
    expect(snapshotSource).toBe(streamSource);
  });
});
