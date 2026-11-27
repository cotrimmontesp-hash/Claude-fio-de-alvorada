const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// o jogo vai como arquivo .html dentro do app
config.resolver.assetExts.push('html');
module.exports = config;
