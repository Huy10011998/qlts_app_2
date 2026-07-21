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
  overrides: [
    {
      // Jest config/setup run in Node with Jest globals.
      files: ["jest.config.js", "jest.setup.js"],
      env: { node: true, jest: true },
    },
  ],
};
