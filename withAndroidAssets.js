const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withAndroidAssets(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const src = path.join(config.modRequest.projectRoot, 'assets', 'www');
      const dest = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'assets', 'www');

      if (!fs.existsSync(src)) {
        console.warn('assets/www not found. Please run npm run copy:web first.');
        return config;
      }

      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.cpSync(src, dest, { recursive: true });
      return config;
    },
  ]);
};
