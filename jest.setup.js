/* Native module mocks so component/App tests can render without a device. */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-orientation-locker', () => ({
  __esModule: true,
  default: {
    lockToPortrait: jest.fn(),
    lockToLandscape: jest.fn(),
    unlockAllOrientations: jest.fn(),
    addOrientationListener: jest.fn(),
    removeOrientationListener: jest.fn(),
    getOrientation: jest.fn(),
  },
}));

jest.mock('react-native-device-info', () => ({
  __esModule: true,
  default: {
    getVersion: jest.fn(() => '1.0.0'),
    getBuildNumber: jest.fn(() => '1'),
    getDeviceId: jest.fn(() => 'test-device'),
    getUniqueId: jest.fn(async () => 'test-unique-id'),
    getModel: jest.fn(() => 'test-model'),
    getSystemVersion: jest.fn(() => '17.0'),
  },
}));

// App dùng modular API của @react-native-firebase/messaging (v22+), nên mock phải
// export các hàm rời chứ không chỉ default namespaced instance.
jest.mock('@react-native-firebase/messaging', () => {
  const messagingInstance = {
    onMessage: jest.fn(() => jest.fn()),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    getInitialNotification: jest.fn(async () => null),
    requestPermission: jest.fn(async () => 1),
    getToken: jest.fn(async () => 'test-token'),
    setBackgroundMessageHandler: jest.fn(),
  };

  return {
    __esModule: true,
    default: () => messagingInstance,
    AuthorizationStatus: {
      NOT_DETERMINED: -1,
      DENIED: 0,
      AUTHORIZED: 1,
      PROVISIONAL: 2,
      EPHEMERAL: 3,
    },
    getMessaging: jest.fn(() => messagingInstance),
    getToken: jest.fn(async () => 'test-token'),
    getAPNSToken: jest.fn(async () => 'test-apns-token'),
    onMessage: jest.fn(() => jest.fn()),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    onTokenRefresh: jest.fn(() => jest.fn()),
    getInitialNotification: jest.fn(async () => null),
    requestPermission: jest.fn(async () => 1),
    hasPermission: jest.fn(async () => 1),
    setBackgroundMessageHandler: jest.fn(),
    registerDeviceForRemoteMessages: jest.fn(async () => {}),
    isDeviceRegisteredForRemoteMessages: jest.fn(() => true),
  };
});

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(async () => 'channel'),
    createChannels: jest.fn(async () => {}),
    displayNotification: jest.fn(async () => {}),
    onForegroundEvent: jest.fn(() => jest.fn()),
    onBackgroundEvent: jest.fn(),
    getInitialNotification: jest.fn(async () => null),
    requestPermission: jest.fn(async () => ({ authorizationStatus: 1 })),
    getNotificationSettings: jest.fn(async () => ({ authorizationStatus: 1 })),
    openNotificationSettings: jest.fn(async () => {}),
    setBadgeCount: jest.fn(async () => {}),
  },
  AndroidImportance: { NONE: 0, MIN: 1, LOW: 2, DEFAULT: 3, HIGH: 4 },
  AndroidVisibility: { SECRET: -1, PRIVATE: 0, PUBLIC: 1 },
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
  EventType: { UNKNOWN: -1, DISMISSED: 0, PRESS: 1, ACTION_PRESS: 2 },
}));

jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
  useCameraDevice: jest.fn(),
  useCameraPermission: jest.fn(() => ({ hasPermission: true, requestPermission: jest.fn() })),
}));

jest.mock('react-native-permissions', () =>
  require('react-native-permissions/mock'),
);

jest.mock('react-native-keychain', () => ({
  __esModule: true,
  getGenericPassword: jest.fn(async () => false),
  setGenericPassword: jest.fn(async () => true),
  resetGenericPassword: jest.fn(async () => true),
  ACCESSIBLE: {
    AFTER_FIRST_UNLOCK: 'AccessibleAfterFirstUnlock',
    WHEN_UNLOCKED: 'AccessibleWhenUnlocked',
  },
}));

jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: { trigger: jest.fn() },
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(async () => ({ isConnected: true })),
  },
}));

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));

jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    DocumentDirectoryPath: '/tmp',
    writeFile: jest.fn(async () => {}),
    exists: jest.fn(async () => false),
    unlink: jest.fn(async () => {}),
    mkdir: jest.fn(async () => {}),
  },
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn(async () => ({})) },
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock('react-native-video', () => 'Video');

jest.mock('react-native-gesture-handler', () =>
  require('react-native-gesture-handler/jestSetup'),
);
