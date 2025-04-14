const fs = require('fs');
const path = require('path');
const semver = require('semver');

module.exports = function (context) {
  const configPath = path.join(context.opts.projectRoot, 'config.xml');

  const config = getConfigParser(context, configPath);
  const targetPackages = config.getPreference('TARGETPACKAGES');

  if (!targetPackages) {
    console.warn("⚠️ TARGETPACKAGES not found in config.xml <preference>");
    return;
  }

  console.log("✅ TARGETPACKAGES found in config.xml:", targetPackages);

  // Optional: write it back into config.xml again to ensure consistency
  // This is safe and ensures it can be used in after_prepare
  config.removePreference('TARGETPACKAGES'); // Clean any duplicate
  config.setPreference('TARGETPACKAGES', targetPackages);
  config.write();
  console.log("✅ Rewrote TARGETPACKAGES into config.xml for future hooks.");
};

// Helper to load correct ConfigParser for your Cordova version
function getConfigParser(context, configPath) {
  let ConfigParser;
  if (semver.lt(context.opts.cordova.version, '5.4.0')) {
    ConfigParser = context.requireCordovaModule('cordova-lib/src/ConfigParser/ConfigParser');
  } else {
    ConfigParser = context.requireCordovaModule('cordova-common/src/ConfigParser/ConfigParser');
  }

  return new ConfigParser(configPath);
}

/*
// hooks/plugin_install.js
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

module.exports = function (context) {
  const configPath = path.join(context.opts.projectRoot, 'config.xml');
  const configXml = fs.readFileSync(configPath, 'utf-8');
  const parser = new xml2js.Parser();
  const builder = new xml2js.Builder();

  parser.parseString(configXml, (err, result) => {
    if (err) throw err;

    const cliVars = context.opts.cli_variables || {};
    const targetPackages = cliVars.TARGETPACKAGES;

    if (!targetPackages) {
      console.warn("⚠️ No TARGETPACKAGES variable provided during plugin install");
      return;
    }

    const preferences = result.widget.preference || [];
    // Remove if it already exists
    result.widget.preference = preferences.filter(p => p.$.name !== 'TARGETPACKAGES');

    result.widget.preference.push({
      $: { name: 'TARGETPACKAGES', value: targetPackages }
    });

    const updatedXml = builder.buildObject(result);
    fs.writeFileSync(configPath, updatedXml, 'utf-8');
    console.log("✅ TARGETPACKAGES written to config.xml:", targetPackages);
  });
};
*/