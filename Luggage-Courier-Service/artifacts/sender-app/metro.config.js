const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const webShims = {
  "expo-apple-authentication": path.resolve(
    __dirname,
    "modules/expo-apple-authentication.web.js"
  ),
};

const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && webShims[moduleName]) {
    return { filePath: webShims[moduleName], type: "sourceFile" };
  }
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

const blockList = config.resolver.blockList
  ? [].concat(config.resolver.blockList)
  : [];
blockList.push(/postal-mime_tmp_/);
config.resolver.blockList = blockList;

config.watchFolders = (config.watchFolders ?? []).filter(
  (f) => !f.includes("api-server")
);

module.exports = config;
