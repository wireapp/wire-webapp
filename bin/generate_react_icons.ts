/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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
import fs from 'fs';
import {JSDOM} from 'jsdom';

const fileLocation = 'resource/image/icon';
const fileList = fs.readdirSync(fileLocation).filter(file => file.endsWith('.svg'));

function capitalize(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function convertToJsx(html: string): string {
  // convert attributes to camelCase
  return html.replace(/<(\w+)([^>]*)\/?>/g, (_, tagName: string, attributes: string) => {
    // Convert attributes to camelCase
    const camelCaseAttributes = attributes.trim().replace(/[\w-]+="[^"]*"/g, attr => {
      const [key, value] = attr.split('=');
      return `${camelize(key)}=${value}`;
    });
    return `<${tagName} ${camelCaseAttributes}>`;
  });
}

function camelize(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|[\b\-_]\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase().replace('-', '').replace('_', '');
    })
    .replace(/\s+/g, '');
}

const svgIcons = fileList.map(name => ({name, content: fs.readFileSync(`${fileLocation}/${name}`, 'utf8')}));
const disclaimer = `
/*
 * This file is generated by bin/generate_react_icons.ts	
 * To refetch all the icons and regenerate their names, run yarn configure.	
 */
`;
const iconPropsType = `
type IconProps = React.SVGProps<SVGSVGElement>;
`;

const reactComponents = svgIcons.map(({name, content}) => {
  const domContent = new JSDOM(content);
  const svgElement = domContent.window.document.querySelector('svg');
  const baseProps = {
    width: svgElement?.getAttribute('width'),
    height: svgElement?.getAttribute('height'),
    viewBox: svgElement?.getAttribute('viewBox'),
  };

  return `export const ${capitalize(camelize(name.replace(/\.svg$/, '')))} = (props: IconProps) => {
    return <svg width="${baseProps.width}" height="${baseProps.height}" viewBox="${baseProps.viewBox}" aria-hidden="true" {...props}>
      ${convertToJsx(svgElement?.innerHTML ?? '')}
      </svg>;
  };`;
});

const dir = 'src/script/components';

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}
fs.writeFileSync(`${dir}/Icon.tsx`, [disclaimer, iconPropsType, ...reactComponents].join('\n'));
