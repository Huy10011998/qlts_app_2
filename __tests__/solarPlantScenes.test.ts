import { getPlantSceneImage } from "../src/screens/Home/shared/plantScenes";
import { getSceneHeight } from "../src/screens/Home/SolarPlantScreen.visuals";

// Ảnh nền nhà máy khớp theo tên site của API. Tên đó do bên cấu hình gõ tay nên
// có thể hoa/thường, có/không dấu, kèm chữ "Nhà máy" — cách khớp phải chịu được
// hết, và site lạ thì phải trả null để màn hình quay về hình vẽ SVG.

describe("getPlantSceneImage", () => {
  it("không có tên thì không có ảnh", () => {
    expect(getPlantSceneImage(null)).toBeNull();
    expect(getPlantSceneImage(undefined)).toBeNull();
    expect(getPlantSceneImage("   ")).toBeNull();
  });

  it("nhà máy chưa đăng ký ảnh thì trả null, không văng", () => {
    expect(getPlantSceneImage("CHOLIMEX FOOD CẦN THƠ")).toBeNull();
  });

  it("khớp bất kể hoa thường, dấu hay chữ đứng trước", () => {
    const vinhLoc = getPlantSceneImage("Vĩnh Lộc");

    expect(vinhLoc).toBeTruthy();
    expect(getPlantSceneImage("VĨNH LỘC")).toBe(vinhLoc);
    expect(getPlantSceneImage("vinh loc")).toBe(vinhLoc);
    expect(getPlantSceneImage("CHOLIMEX FOOD VĨNH LỘC")).toBe(vinhLoc);
    expect(getPlantSceneImage("Nhà máy Vĩnh Lộc")).toBe(vinhLoc);
  });

  it("hai nhà máy ra hai ảnh khác nhau", () => {
    const benLuc = getPlantSceneImage("CHOLIMEX FOOD BẾN LỨC");

    expect(benLuc).toBeTruthy();
    expect(benLuc).not.toBe(getPlantSceneImage("CHOLIMEX FOOD VĨNH LỘC"));
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
