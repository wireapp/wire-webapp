const fs = require('fs');
const glob = require('glob');

const targetYear = new Date().getFullYear();
const copyrightRegex = /Copyright \(C\) \d{4} Wire Swiss GmbH/g;
const excludeDirs = ['**/node_modules/**', '**/.git/**'];

const updateCopyrightInFile = filePath => {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading file ${filePath}:`, err);
      return;
    }
    const updatedData = data.replace(copyrightRegex, `Copyright (C) ${targetYear} Wire Swiss GmbH`);
    fs.writeFileSync(filePath, updatedData, 'utf8');
  });
};

glob('**/*', {ignore: excludeDirs}, (err, files) => {
  if (err) {
    console.error('Error finding files:', err);
    return;
  }
  files.forEach(file => {
    updateCopyrightInFile(file);
  });
});
