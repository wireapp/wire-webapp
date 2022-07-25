/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

const fs = require('fs');
const path = require('path');
const docgen = require('react-docgen');
const packageJson = require('./package.json');

function resolve(...paths) {
  return fs.realpathSync(path.join(__dirname, ...paths));
}

module.exports = {
  resolver: docgen.resolver.findAllExportedComponentDefinitions,
  sections: [
    {
      components: 'src/Form/**/*.tsx',
      ignore: [
        'src/Form/ShakeBox.tsx',
        'src/Form/Input.tsx',
        'src/Form/InputBlock.tsx',
        'src/Form/RoundIconButton.tsx',
        'src/Form/InputSubmitCombo.tsx',
        'src/Form/SelectComponents.tsx',
        'src/Form/SelectStyles.tsx',
      ],
      name: 'Forms',
    },
    {
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
      name: 'Layout',
    },
    {components: 'src/Identity/**/*.tsx', name: 'Identity'},
    {components: 'src/Menu/**/*.tsx', ignore: ['src/Menu/MenuModal.tsx'], name: 'Menu'},
    {components: 'src/Modal/**/*.tsx', ignore: ['src/Modal/Overlay.tsx'], name: 'Modal'},
    {components: 'src/Misc/**/*.tsx', ignore: ['src/Misc/IsInViewport.tsx'], name: 'Misc'},
    {components: 'src/Text/**/*.tsx', name: 'Typography'},
    {
      components: 'src/Icon/SVGIcon.tsx',
      name: 'Icons',
    },
    {
      content: 'src/Identity/colors.md',
      name: 'Colors',
    },
    {
      content: 'src/Identity/colors-v2.md',
      name: 'Colors v2',
    },
  ],
  serverPort: 8090,
  skipComponentsWithoutExample: true,
  styleguideComponents: {
    Wrapper: resolve('styleguide/wrapper.js'),
  },
  styles: {
    Playground: {
      preview: {
        padding: 0,
      },
    },
  },
  title: `React UI Kit v${packageJson.version}`,
  usageMode: 'expand',
};
