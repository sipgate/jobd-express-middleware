import debug from "debug";
const packageJson = require("../package.json");

export const logger = debug(packageJson.name);