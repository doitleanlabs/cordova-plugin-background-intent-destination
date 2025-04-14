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

    const targetPackages = context.opts.cli_variables?.TARGETPACKAGES;
    if (!targetPackages) {
      console.warn("⚠️ TARGETPACKAGES variable not provided — skipping injection into config.xml");
      return;
    }

    console.warn("✅ TARGETPACKAGES found: " + targetPackages);
    // Remove existing preference if present
    result.widget.preference = preferences.filter(p => p.$.name !== 'TARGETPACKAGES');

    // Add updated one
    result.widget.preference.push({
      $: { name: 'TARGETPACKAGES', value: targetPackages }
    });

    const updatedXml = builder.buildObject(result);
    fs.writeFileSync(configPath, updatedXml, 'utf-8');
    console.log("✅ Wrote TARGETPACKAGES into config.xml:", targetPackages);
  });
};
