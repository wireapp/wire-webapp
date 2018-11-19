const less = require('less');
const path = require('path');
const fs = require('fs-extra');

const src = path.resolve(__dirname, '../app/style');
const dist = path.resolve(__dirname, '../deploy/style');

process.chdir(src);
fs.mkdirpSync(dist);

const files = {
  [`${dist}/auth.css`]: fs.readFileSync(`${src}/auth/auth.less`, 'utf8'),
  [`${dist}/main.css`]: fs.readFileSync(`${src}/main.less`, 'utf8'),
  [`${dist}/support.css`]: fs.readFileSync(`${src}/support.less`, 'utf8'),
};

Object.entries(files).forEach(file => {
  renderCSS(file[1], file[0]);
});

function renderCSS(lessInput, ouputFolder) {
  less
    .render(lessInput, {sourceMap: {}})
    .then(output => {
      fs.writeFileSync(ouputFolder, output.css, 'utf8');
      if (output.map) {
        fs.writeFileSync(`${ouputFolder}.map`, output.map, 'utf8');
      }
    })
    .catch(error => console.error('error', error));
}
