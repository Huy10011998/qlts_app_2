declare module "react-native-secure-storage" {
  type Options = {
    accessible?:
      | "AccessibleWhenUnlocked"
      | "AccessibleAfterFirstUnlock"
      | "AccessibleAlways";
    securityLevel?: "SECURE_SOFTWARE" | "SECURE_HARDWARE";
  };

  const SecureStorage: {
    setItem(key: string, value: string, options?: Options): Promise<void>;
    getItem(key: string, options?: Options): Promise<string | null>;
    removeItem(key: string, options?: Options): Promise<void>;
  };

  export default SecureStorage;
}
