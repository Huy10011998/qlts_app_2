import { openAssetRelatedList } from "../src/navigation/shared/assetNavigationReset";

// Sau khi thêm bản ghi con từ đường tắt vuốt ở danh sách cha: phải THAY màn
// thêm mới bằng danh sách con, chứ không reset stack — reset là mất luôn danh
// sách cha, bấm back sẽ nhảy về menu tài sản thay vì chỗ vừa vuốt.
const RELATED_PARAMS = {
  nameClass: "DanhGia_BinhChuaChay",
  idRoot: "7",
  propertyReference: "iD_BinhChuaChay",
  titleHeader: "Đánh giá (BCC)",
};

const ASSET_CONTEXT = { groupMenuId: 3, viewPermission: "View_BCC" };

describe("openAssetRelatedList", () => {
  it("replace màn hiện tại bằng danh sách con", () => {
    const dispatched: any[] = [];
    const resets: any[] = [];

    openAssetRelatedList(
      {
        dispatch: (action: any) => dispatched.push(action),
        reset: (state: any) => resets.push(state),
      },
      { assetContext: ASSET_CONTEXT, relatedListParams: RELATED_PARAMS },
    );

    expect(resets).toHaveLength(0);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toMatchObject({
      type: "REPLACE",
      payload: { name: "AssetRelatedList", params: RELATED_PARAMS },
    });
  });

  it("không dispatch được thì dựng lại stack tới danh sách con", () => {
    const resets: any[] = [];

    openAssetRelatedList(
      { reset: (state: any) => resets.push(state) },
      { assetContext: ASSET_CONTEXT, relatedListParams: RELATED_PARAMS },
    );

    expect(resets).toHaveLength(1);
    expect(resets[0].routes.at(-1)).toMatchObject({
      name: "AssetRelatedList",
      params: RELATED_PARAMS,
    });
  });
});
