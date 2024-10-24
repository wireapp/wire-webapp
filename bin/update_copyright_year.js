const fs = require('fs');
const path = require('path');
const glob = require('glob');

const currentYear = new Date().getFullYear();
const copyrightRegex = /Copyright \(C\) \d{4}/g;

glob('./**/*', {nodir: true}, (err, files) => {
  if (err) {
    console.error(`Error finding files: ${err}`);
    return;
  }

  files.forEach(file => {
    fs.readFile(file, 'utf8', (readErr, data) => {
      if (readErr) {
        console.error(`Error reading file ${file}: ${readErr}`);
        return;
      }

      const updatedData = data.replace(copyrightRegex, `Copyright (C) ${currentYear}`);

      if (data !== updatedData) {
        fs.writeFile(file, updatedData, 'utf8', writeErr => {
          if (writeErr) {
            console.error(`Error writing to file ${file}: ${writeErr}`);
            return;
          }
        });
      }
    });
  });
});
