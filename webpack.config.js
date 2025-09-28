const webpack = require('webpack');
const dotenv = require('dotenv');
const path = require('path');

module.exports = (config, options) => {
  // Load environment variables from .env.local (for development) or system environment (for production)
  const envPath = path.resolve(process.cwd(), '.env.local');
  const envVars = dotenv.config({ path: envPath }).parsed || {};
  
  // Merge with system environment variables (for CI/CD)
  const allEnvVars = { ...envVars, ...process.env };
  
  // Create environment variables object for DefinePlugin
  const envForDefine = {};
  Object.keys(allEnvVars).forEach(key => {
    if (key.startsWith('NG_APP_')) {
      // Remove NG_APP_ prefix for the define constants
      const defineKey = key;
      envForDefine[defineKey] = JSON.stringify(allEnvVars[key]);
    }
  });
  
  // Use DefinePlugin to inject environment variables at build time
  config.plugins.push(
    new webpack.DefinePlugin(envForDefine)
  );

  console.log('🔧 Webpack: Environment variables loaded for build');
  console.log('🔧 Available variables:', Object.keys(envForDefine).join(', '));
  
  return config;
};