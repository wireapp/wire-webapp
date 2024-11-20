const fs = require('fs');
const path = require('path');

function escapeString(str) {
  return str
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/'/g, "\\'") // Escape single quotes
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\t/g, '\\t'); // Escape tabs
}

function generateTypeDefinition(jsonPath, outputPath) {
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  let content = "declare module 'I18n/en-US.json' {\n";
  content += '  const translations: {\n';

  for (const [key, value] of Object.entries(json)) {
    content += `    '${key}': \`${escapeString(value)}\`;\n`;
  }

  content += '  };\n';
  content += '  export default translations;\n';
  content += '}\n';

  fs.writeFileSync(outputPath, content);
}

const ROOT_PATH = path.resolve(__dirname, '..');

generateTypeDefinition(path.join(ROOT_PATH, 'src/i18n/en-US.json'), path.join(ROOT_PATH, 'src/types/i18n.d.ts'));
