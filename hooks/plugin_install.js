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

    const preferences = result.widget.preference || [];

    const targetPackages = context.opts.cli_variables?.targetPackages;
    if (!targetPackages) {
      console.warn("⚠️ TARGET_PACKAGES variable not provided — skipping injection into config.xml");
      return;
    }

    console.warn("✅ TARGET_PACKAGES found: " + targetPackages);
    // Remove existing preference if present
    result.widget.preference = preferences.filter(p => p.$.name !== 'targetPackages');

    // Add updated one
    result.widget.preference.push({
      $: { name: 'targetPackages', value: targetPackages }
    });

    const updatedXml = builder.buildObject(result);
    fs.writeFileSync(configPath, updatedXml, 'utf-8');
    console.log("✅ Wrote targetPackages into config.xml:", targetPackages);
  });
};
