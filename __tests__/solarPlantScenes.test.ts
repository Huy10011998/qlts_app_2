import { getPlantScene } from "../src/screens/Home/shared/plantScenes";
import { getSceneHeight } from "../src/screens/Home/SolarPlantScreen.visuals";

// Ảnh nền nhà máy khớp theo tên site của API. Tên đó do bên cấu hình gõ tay nên
// có thể hoa/thường, có/không dấu, kèm chữ "Nhà máy" — cách khớp phải chịu được
// hết, và site lạ thì phải trả null để màn hình quay về hình vẽ SVG.

describe("getPlantScene", () => {
  it("không có tên thì không có ảnh", () => {
    expect(getPlantScene(null)).toBeNull();
    expect(getPlantScene(undefined)).toBeNull();
    expect(getPlantScene("   ")).toBeNull();
  });

  it("nhà máy chưa đăng ký ảnh thì trả null, không văng", () => {
    expect(getPlantScene("CHOLIMEX FOOD CẦN THƠ")).toBeNull();
  });

  it("khớp bất kể hoa thường, dấu hay chữ đứng trước", () => {
    const vinhLoc = getPlantScene("Vĩnh Lộc");

    expect(vinhLoc).toBeTruthy();
    expect(getPlantScene("VĨNH LỘC")).toBe(vinhLoc);
    expect(getPlantScene("vinh loc")).toBe(vinhLoc);
    expect(getPlantScene("CHOLIMEX FOOD VĨNH LỘC")).toBe(vinhLoc);
    expect(getPlantScene("Nhà máy Vĩnh Lộc")).toBe(vinhLoc);
  });

  it("hai nhà máy ra hai ảnh khác nhau", () => {
    const benLuc = getPlantScene("CHOLIMEX FOOD BẾN LỨC");

    expect(benLuc).toBeTruthy();
    expect(benLuc).not.toBe(getPlantScene("CHOLIMEX FOOD VĨNH LỘC"));
  });
});

// Khung cảnh nhà máy cao theo chiều rộng khối: cắm cứng 145 thì trên tablet dải
// ảnh dẹt gần 5:1 và `cover` cắt mất phần lớn nhà máy.
describe("getSceneHeight", () => {
  it("giữ tỉ lệ của bản điện thoại", () => {
    expect(getSceneHeight(390)).toBe(145);
  });

  it("máy hẹp hơn vẫn không thấp hơn bản điện thoại", () => {
    expect(getSceneHeight(320)).toBe(145);
  });

  it("khối rộng thì cao thêm nhưng có chặn trên", () => {
    expect(getSceneHeight(520)).toBeGreaterThan(145);
    expect(getSceneHeight(720)).toBe(230);
    expect(getSceneHeight(2000)).toBe(230);
  });
});

// Toạ độ mái pin đo trực tiếp trên ảnh gốc; lệch khỏi [0..1] là lớp highlight
// sẽ vẽ ra ngoài ảnh.
describe("panelZones của từng nhà máy", () => {
  it("mọi góc đều nằm trong khung ảnh và lưới module dương", () => {
    for (const name of ["VĨNH LỘC", "BẾN LỨC"]) {
      const scene = getPlantScene(name);

      expect(scene).toBeTruthy();
      expect(scene!.panelZones.length).toBeGreaterThan(0);

      for (const zone of scene!.panelZones) {
        expect(zone.corners).toHaveLength(4);

        for (const [u, v] of zone.corners) {
          expect(u).toBeGreaterThanOrEqual(0);
          expect(u).toBeLessThanOrEqual(1);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }

        expect(zone.cols).toBeGreaterThan(1);
        expect(zone.rows).toBeGreaterThan(1);
      }

      expect(scene!.imageSize.width).toBeGreaterThan(0);
      expect(scene!.imageSize.height).toBeGreaterThan(0);
    }
  });

  it("Bến Lức phủ pin mái nhà chính, mảng nêm bên trái và mái kho bên phải", () => {
    expect(getPlantScene("CHOLIMEX FOOD BẾN LỨC")!.panelZones).toHaveLength(3);
  });
});
