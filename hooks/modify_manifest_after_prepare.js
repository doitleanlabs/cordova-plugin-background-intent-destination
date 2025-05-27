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

  const projectRoot = context.opts.projectRoot;
  const usesNewStructure = fs.existsSync(path.join(projectRoot, 'platforms', 'android', 'app'));
  const basePath = usesNewStructure ? path.join(projectRoot, 'platforms', 'android', 'app', 'src', 'main') : path.join(projectRoot, 'platforms', 'android');
  const configPath = path.join(basePath, 'res', 'xml', 'config.xml');

  const configXml = fs.readFileSync(configPath, 'utf-8');
  const configParser = getConfigParser(context, configPath);
  const targetPackagesRaw = configParser.getPreference('TARGETPACKAGES') || '';

  const requiredPackages = targetPackagesRaw
    .split(',')
    .map(pkg => pkg.trim())
    .filter(Boolean);

  if (requiredPackages.length) {
    console.log("📦 Found TARGETPACKAGES from ConfigParser:", requiredPackages);
  } else {
    console.warn("⚠️ TARGETPACKAGES preference not found or empty.");
  }

  let appPackage = null;
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

    // ✅ Only keep the dynamic QUERIES section
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
