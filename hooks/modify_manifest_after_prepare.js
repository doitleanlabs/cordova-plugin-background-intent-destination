const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const semver = require('semver');

// Helper to get the correct ConfigParser for your Cordova version
function getConfigParser(context, configPath) {
  let ConfigParser;
  if (semver.lt(context.opts.cordova.version, '5.4.0')) {
    ConfigParser = context.requireCordovaModule('cordova-lib/src/ConfigParser/ConfigParser');
  } else {
    ConfigParser = context.requireCordovaModule('cordova-common/src/ConfigParser/ConfigParser');
  }

  return new ConfigParser(configPath);
}

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

  const configPath = path.join(context.opts.projectRoot, 'config.xml');
  const configXml = fs.readFileSync(configPath, 'utf-8');

  let appPackage = null;

  const configParser = getConfigParser(context, configPath);
  const targetPackagesRaw = configParser.getPreference('TARGETPACKAGES') || '';

  console.log('targetPackagesRaw', targetPackagesRaw);
  const requiredPackages = targetPackagesRaw
    .split(',')
    .map(pkg => pkg.trim())
    .filter(Boolean);

  if (requiredPackages.length) {
    console.log("📦 Found TARGETPACKAGES from ConfigParser:", requiredPackages);
  } else {
    console.warn("⚠️ TARGETPACKAGES preference not found or empty.");
  }

  

  xml2js.parseString(configXml, (err, result) => {
    if (err || !result.widget || !result.widget.$ || !result.widget.$.id) {
      throw new Error("❌ Could not read app package ID from config.xml");
    }
  
    appPackage = result.widget.$.id;
  });

  const manifestXml = fs.readFileSync(manifestPath, 'utf-8');

  xml2js.parseString(manifestXml, (err, result) => {
    if (err) {
      console.error("❌ Failed to parse AndroidManifest.xml:", err);
      return;
    }

    const manifest = result['manifest'];
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
          //'android:permission': 'outsystems.dohle.FILO.ALLOW_FILE_REQUEST',
          'android:foregroundServiceType': 'dataSync'
        }
      });
      console.log("✅ Service injected:", serviceName);
    } else {
      console.log("ℹ️ Service already present:", serviceName);
    }


    /* FILE PROVIDER */ 
    const providerName = 'com.darryncampbell.cordova.plugin.intent.CordovaPluginIntentFileProvider';
    const authority = appPackage + '.darryncampbell.cordova.plugin.intent.fileprovider';

    const hasProvider = (app['provider'] || []).some(p => p.$['android:name'] === providerName);

    if (!hasProvider) {
      app['provider'] = app['provider'] || [];
      app['provider'].push({
        $: {
          'android:name': providerName,
          'android:authorities': authority,
          'android:exported': 'false',
          'android:grantUriPermissions': 'true'
        },
        'meta-data': [{
          $: {
            'android:name': 'android.support.FILE_PROVIDER_PATHS',
            'android:resource': '@xml/provider_paths'
          }
        }]
      });

      console.log("✅ FileProvider added to AndroidManifest.xml");
    } else {
      console.log("ℹ️ FileProvider already present");
    }

    /* QUERIES*/
    manifest.queries = manifest.queries || [{}];
    const queriesEntry = manifest.queries[0];

    // Ensure 'package' key exists
    queriesEntry['package'] = queriesEntry['package'] || [];
    const existingQueries = queriesEntry['package'];

    console.log(`✅ Required package list: ${requiredPackages}`);
    
    requiredPackages.forEach(pkg => {
      const alreadyPresent = existingQueries.some(entry => entry.$ && entry.$['android:name'] === pkg);
      if (!alreadyPresent) {
        existingQueries.push({ $: { 'android:name': pkg } });
        console.log(`✅ Added <queries> entry for package: ${pkg}`);
      }
    });

    const builder = new xml2js.Builder();
    const updatedXml = builder.buildObject(result);
    fs.writeFileSync(manifestPath, updatedXml, 'utf-8');
    console.log("✅ AndroidManifest.xml successfully updated.");
  });
};
