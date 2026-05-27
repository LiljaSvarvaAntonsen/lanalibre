const fs = require('fs');
const path = require('path');

// During EAS builds, GOOGLE_SERVICES_JSON is injected as a secret.
// Write it to disk before prebuild reads googleServicesFile from app.json.
if (process.env.GOOGLE_SERVICES_JSON) {
  fs.writeFileSync(
    path.resolve(__dirname, 'google-services.json'),
    process.env.GOOGLE_SERVICES_JSON,
  );
}

module.exports = ({ config }) => config;
