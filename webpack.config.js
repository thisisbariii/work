const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Remove the problematic property if it exists
  delete config.unstable_perfLoggerFactory;
  
  // Add path alias resolution for web
  config.resolve.alias = {
    ...config.resolve.alias,
    '@': path.resolve(__dirname, './'),
  };
  
  return config;
};