// `sessionUnlocked`: đã mở khoá trong lần chạy app này — qua Face ID / vân tay /
// khoá màn hình hoặc gõ mật khẩu. Android chưa bật cái nào thì AuthContext mở
// khoá sẵn lúc khởi động nên vẫn vào thẳng như trước.
type RootNavigatorAccessParams = {
  sessionUnlocked: boolean;
  isAuthenticated: boolean;
};

export const canLoadRootPermissions = ({
  sessionUnlocked,
  isAuthenticated,
}: RootNavigatorAccessParams) => isAuthenticated && sessionUnlocked;

export const canAccessAppNavigator = ({
  sessionUnlocked,
  isAuthenticated,
}: RootNavigatorAccessParams) => isAuthenticated && sessionUnlocked;
