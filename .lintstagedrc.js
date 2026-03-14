const path = require("path");

const buildNextEslintCommand = (filenames) =>
  `yarn next:lint-staged -- ${filenames
    .map((f) => path.relative(path.join("packages", "nextjs"), f))
    .map((f) => `"${f}"`)
    .join(" ")}`;

const checkTypesNextCommand = () => "yarn next:check-types";

const buildHardhatEslintCommand = (filenames) =>
  `yarn hardhat:lint-staged --fix ${filenames
    .map((f) => path.relative(path.join("packages", "hardhat"), f))
    .join(" ")}`;

module.exports = {
  "packages/nextjs/**/*.{ts,tsx}": [
    buildNextEslintCommand,
    checkTypesNextCommand,
  ],
  "packages/hardhat/**/*.{ts,tsx}": [buildHardhatEslintCommand],
};