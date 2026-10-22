// `sessionUnlocked`: đã mở khoá trong lần chạy app này — qua Face ID / vân tay
// hoặc gõ mật khẩu. Android chưa bật vân tay thì AuthContext mở khoá sẵn lúc
// khởi động nên vẫn vào thẳng như trước.
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
