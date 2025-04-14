const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

module.exports = function (context) {
  const configPath = path.join(context.opts.projectRoot, 'config.xml');
  const configXml = fs.readFileSync(configPath, 'utf-8');
  const parser = new xml2js.Parser();
  const builder = new xml2js.Builder();

  const cliVars = context.opts.plugin?.variables || {};
  console.logg('plugin', context.opts.plugin);
  console.logg('cliVars', cliVars);
  const targetPackages = cliVars.TARGETPACKAGES;

  if (!targetPackages) {
    console.warn("⚠️ TARGETPACKAGES variable not provided during plugin install.");
    return;
  }
  console.warn("📦 TARGETPACKAGES FOUND: " + targetPackages);

  parser.parseString(configXml, (err, result) => {
    if (err) throw err;

    result.widget.preference = result.widget.preference || [];

    // Remove existing
    result.widget.preference = result.widget.preference.filter(p => p.$.name !== 'TARGETPACKAGES');

    // Write new
    result.widget.preference.push({
      $: { name: 'TARGETPACKAGES', value: targetPackages }
    });

    const updatedXml = builder.buildObject(result);
    fs.writeFileSync(configPath, updatedXml, 'utf-8');
    console.log("✅ TARGETPACKAGES written to config.xml:", targetPackages);
  });
};


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