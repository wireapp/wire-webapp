const fs = require('fs');

const originalPackage = require('../package.json');
originalPackage.main = './index.js';
delete originalPackage.scripts;

fs.writeFileSync('./dist/package.json', JSON.stringify(originalPackage, null, '  '));
