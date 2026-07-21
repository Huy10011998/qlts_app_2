module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Đừng quét test bên trong native/vendor (ios/Pods có sẵn hàng trăm test rác).
  testPathIgnorePatterns: [
    '/node_modules/',
    '/ios/',
    '/android/',
    '/vendor/',
  ],
  // Preset mặc định chỉ transform react-native core; các lib RN bên thứ ba
  // (navigation, react-native-*, notifee, firebase...) ship ESM nên phải mở thêm.
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '(?:jest-)?@?react-native' +
      '|@react-native-community' +
      '|@react-native-firebase' +
      '|@react-native-async-storage' +
      '|@react-native-picker' +
      '|@react-navigation' +
      '|@notifee' +
      '|react-native-.*' +
      '|react-redux' +
      '|@reduxjs/toolkit' +
      '|immer' +
      '|jwt-decode' +
      ')/)',
  ],
};
