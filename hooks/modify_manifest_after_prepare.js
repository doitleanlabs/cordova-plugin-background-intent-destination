const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

module.exports = function (context) {
  const manifestPath = path.join(
    context.opts.projectRoot,
    'platforms',
    'android',
    'app',
    'src',
    'main',
    'AndroidManifest.xml'
  );

  if (!fs.existsSync(manifestPath)) {
    console.error("❌ AndroidManifest.xml not found at expected location:", manifestPath);
    return;
  }

  const manifestXml = fs.readFileSync(manifestPath, 'utf-8');

  xml2js.parseString(manifestXml, (err, result) => {
    if (err) {
      console.error("❌ Failed to parse AndroidManifest.xml:", err);
      return;
    }

    const app = result['manifest']['application'][0];

    // ✅ Inject MyBackgroundService if not already there
    const serviceName = 'com.darryncampbell.cordova.plugin.intent.MyBackgroundService';
    const existingService = (app.service || []).find(s => s.$['android:name'] === serviceName);

    if (!existingService) {
      app.service = app.service || [];
      app.service.push({
        $: {
          'android:name': serviceName,
          'android:enabled': 'true',
          'android:exported': 'true',
          'android:permission': 'outsystems.dohle.FILO.ALLOW_FILE_REQUEST'
        }
      });
      console.log("✅ Service injected:", serviceName);
    } else {
      console.log("ℹ️ Service already present:", serviceName);
    }

    const builder = new xml2js.Builder();
    const updatedXml = builder.buildObject(result);
    fs.writeFileSync(manifestPath, updatedXml, 'utf-8');
    console.log("✅ AndroidManifest.xml successfully updated.");
  });
};
