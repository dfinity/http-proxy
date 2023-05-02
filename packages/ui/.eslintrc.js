module.exports = {
  extends: ["../../configs/eslintrc.base.json"],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: "./tsconfig.json",
  },
  ignorePatterns: ["node_modules/*", "built/*", "data/*", ".eslintrc.js", "build/*"],
};
