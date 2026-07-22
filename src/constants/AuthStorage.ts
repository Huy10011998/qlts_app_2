export const AUTH_LOGIN_SERVICE = "auth-login";
export const FACE_ID_LOGIN_SERVICE = "faceid-login";
export const FACE_ID_ENABLED_KEY = "faceid-enabled";
// Durable Keychain-backed flag for the "Face ID enabled" state. Unlike the
// legacy AsyncStorage key above (wiped on app uninstall), this survives an
// uninstall/reinstall so Face ID stays available without re-entering the
// password. Stored WITHOUT biometric access control so it can be read
// silently to decide whether to show the Face ID button.
export const FACE_ID_ENABLED_SERVICE = "faceid-enabled-flag";
export const FACE_ID_MARKER_USERNAME = "faceid";
export const FACE_ID_MARKER_PASSWORD = "enabled";
