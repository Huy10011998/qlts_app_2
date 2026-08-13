import { ADD_FAB_CLEARANCE } from "../src/components/add/shared/AddActionFab";
import { makeSharedAssetListStyles } from "../src/components/assets/shared/listStyles";
import { makeNoiDiaListStyles } from "../src/screens/NoiDia/shared/noiDiaListStyles";
import { APP_COLORS } from "../src/utils/helpers/colors";

const assetStyles = makeSharedAssetListStyles(APP_COLORS.light);
const noiDiaStyles = makeNoiDiaListStyles(APP_COLORS.light);

describe("khoảng chừa đáy danh sách cho nút Thêm mới", () => {
  it("đủ cao để nút không che thẻ cuối", () => {
    // Nút cao 64 và cách đáy 16 nên khoảng chừa phải hơn 80.
    expect(ADD_FAB_CLEARANCE).toBeGreaterThan(64 + 16);
  });

  it("hai nhóm màn dùng chung một con số, không gõ tay mỗi nơi một kiểu", () => {
    expect(assetStyles.listContentWithFab.paddingBottom).toBe(
      ADD_FAB_CLEARANCE,
    );
    expect(noiDiaStyles.listContentWithFab.paddingBottom).toBe(
      ADD_FAB_CLEARANCE,
    );
  });

  it("chỉ là style cộng thêm: bản gốc vẫn giữ khoảng chừa nhỏ cho màn không có nút", () => {
    expect(assetStyles.listContent.paddingBottom).toBeLessThan(
      ADD_FAB_CLEARANCE,
    );
    expect(noiDiaStyles.listContent.paddingBottom).toBeLessThan(
      ADD_FAB_CLEARANCE,
    );
  });
});
