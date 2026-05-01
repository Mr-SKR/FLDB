import nextConfig from "eslint-config-next";
import tseslint from "typescript-eslint";

const config = [
  ...nextConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default config;
