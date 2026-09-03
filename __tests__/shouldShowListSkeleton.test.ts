import { shouldShowListSkeleton } from "../src/components/ui/shouldShowListSkeleton";

describe("khi nào vẽ khung chờ danh sách", () => {
  it("màn trống và đang tải thì vẽ", () => {
    expect(shouldShowListSkeleton({ isFetching: true, isEmpty: true })).toBe(
      true,
    );
  });

  // Mở lại app sau khi dữ liệu cũ, hoặc thử lại sau lỗi: danh sách cũ phải đứng
  // yên, che nó bằng khung xám là làm mất chỗ người dùng đang đọc.
  it("đã có dữ liệu thì tải lại âm thầm", () => {
    expect(shouldShowListSkeleton({ isFetching: true, isEmpty: false })).toBe(
      false,
    );
  });

  it("kéo xuống làm mới thì để RefreshControl lo", () => {
    expect(
      shouldShowListSkeleton({
        isFetching: true,
        isEmpty: true,
        isRefreshing: true,
      }),
    ).toBe(false);
  });

  it("đang tìm kiếm thì không vẽ", () => {
    expect(
      shouldShowListSkeleton({
        isFetching: true,
        isEmpty: true,
        isSearching: true,
      }),
    ).toBe(false);
  });

  it("không tải thì không vẽ", () => {
    expect(shouldShowListSkeleton({ isFetching: false, isEmpty: true })).toBe(
      false,
    );
  });
});
