/* eslint-disable sort-keys-fix/sort-keys-fix */
const fs = require('fs');
const path = require('path');
const docgen = require('react-docgen');
const packageJson = require('./package.json');

function resolve(...paths) {
  return fs.realpathSync(path.join(__dirname, ...paths));
}

module.exports = {
  title: `React UI Kit v${packageJson.version}`,
  serverPort: 8090,
  skipComponentsWithoutExample: true,
  sections: [
    {
      name: 'Forms',
      components: 'src/Form/**/*.tsx',
      ignore: [
        'src/Form/ShakeBox.tsx',
        'src/Form/Input.tsx',
        'src/Form/InputBlock.tsx',
        'src/Form/RoundIconButton.tsx',
        'src/Form/InputSubmitCombo.tsx',
      ],
    },
    {
      name: 'Layout',
      components: 'src/Layout/**/*.tsx',
      ignore: [
        'src/Layout/headerMenu/HeaderSubMenu.tsx',
        'src/Layout/headerMenu/MenuContent.tsx',
        'src/Layout/headerMenu/MenuItems.tsx',
        'src/Layout/headerMenu/MenuLink.tsx',
        'src/Layout/headerMenu/MenuOpenButton.tsx',
        'src/Layout/headerMenu/MenuScrollableItems.tsx',
        'src/Layout/headerMenu/MenuSubLink.tsx',
      ],
    },
    {name: 'Identity', components: 'src/Identity/**/*.tsx'},
    {name: 'Menu', components: 'src/Menu/**/*.tsx', ignore: ['src/Menu/MenuModal.tsx']},
    {name: 'Modal', components: 'src/Modal/**/*.tsx', ignore: ['src/Modal/Overlay.tsx']},
    {name: 'Misc', components: 'src/Misc/**/*.tsx', ignore: ['src/Misc/IsInViewport.tsx']},
    {name: 'Typography', components: 'src/Text/**/*.tsx'},
    {
      name: 'Icons',
      components: 'src/Icon/SVGIcon.tsx',
    },
    {
      name: 'Colors',
      content: 'src/Identity/colors.md',
    },
  ],
  styleguideComponents: {
    Wrapper: resolve('styleguide/wrapper.js'),
  },
  resolver: docgen.resolver.findAllExportedComponentDefinitions,
  styles: {
    Playground: {
      preview: {
        padding: 0,
      },
    },
  },
  usageMode: 'expand',
};
