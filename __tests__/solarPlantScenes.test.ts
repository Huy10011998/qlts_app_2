import { getPlantSceneImage } from "../src/screens/Home/shared/plantScenes";

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
