module.exports = {
  root: true,
  extends: ["@react-native"],
  ignorePatterns: [
    "node_modules/",
    "android/",
    "ios/",
    "vendor/",
    "coverage/",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "react/react-in-jsx-scope": "off",
    "react-hooks/exhaustive-deps": "warn",
  },
};
