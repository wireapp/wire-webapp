const fs = require('fs');

const originalPackage = require('../package.json');
originalPackage.main = './index.js';

fs.writeFileSync('./dist/package.json', JSON.stringify(originalPackage, null, '  '));
