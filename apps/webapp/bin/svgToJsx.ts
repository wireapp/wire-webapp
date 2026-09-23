/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {isNonEmptyString, isUndefined} from '@sindresorhus/is';

type InlineStyleProperty = {
  name: string;
  value: string;
};

function convertAttributesToJsx(attributes: string): string {
  return attributes.trim().replace(/([\w-]+)="([^"]*)"/g, (_match, attributeName, attributeValue) => {
    const jsxAttributeName = camelize(attributeName);

    if (jsxAttributeName === 'style') {
      return `style={${convertInlineStyleToJsxObject(attributeValue)}}`;
    }

    return `${jsxAttributeName}=${JSON.stringify(attributeValue)}`;
  });
}

function convertInlineStyleToJsxObject(inlineStyle: string): string {
  const styleProperties = parseInlineStyle(inlineStyle).map(({name, value}) => {
    const reactPropertyName = convertCssPropertyNameToReact(name);

    return `${JSON.stringify(reactPropertyName)}: ${JSON.stringify(value)}`;
  });

  return `{${styleProperties.join(', ')}}`;
}

function parseInlineStyle(inlineStyle: string): readonly InlineStyleProperty[] {
  const styleProperties: InlineStyleProperty[] = [];

  for (const declaration of splitAtTopLevel(inlineStyle, ';')) {
    const declarationParts = splitAtTopLevel(declaration, ':');
    const propertyName = declarationParts.shift()?.trim();
    const propertyValue = declarationParts.join(':').trim();

    if (!isNonEmptyString(propertyName) || !isNonEmptyString(propertyValue)) {
      continue;
    }

    styleProperties.push({name: propertyName, value: propertyValue});
  }

  return styleProperties;
}

function splitAtTopLevel(value: string, delimiter: string): string[] {
  const segments: string[] = [];
  let currentSegment = '';
  let parenthesisDepth = 0;
  let quoteCharacter: '"' | "'" | undefined;
  let previousCharacterWasEscape = false;

  for (const character of value) {
    if (!isUndefined(quoteCharacter)) {
      currentSegment += character;

      if (previousCharacterWasEscape) {
        previousCharacterWasEscape = false;
      } else if (character === '\\') {
        previousCharacterWasEscape = true;
      } else if (character === quoteCharacter) {
        quoteCharacter = undefined;
      }

      continue;
    }

    if (character === '"' || character === "'") {
      quoteCharacter = character;
      currentSegment += character;
      continue;
    }

    if (character === '(') {
      parenthesisDepth += 1;
      currentSegment += character;
      continue;
    }

    if (character === ')') {
      parenthesisDepth = Math.max(0, parenthesisDepth - 1);
      currentSegment += character;
      continue;
    }

    if (character === delimiter && parenthesisDepth === 0) {
      segments.push(currentSegment);
      currentSegment = '';
      continue;
    }

    currentSegment += character;
  }

  segments.push(currentSegment);
  return segments;
}

function convertCssPropertyNameToReact(propertyName: string): string {
  if (propertyName.startsWith('--')) {
    return propertyName;
  }

  const hasVendorPrefix = propertyName.startsWith('-');
  const propertyNameWithoutLeadingHyphen = hasVendorPrefix ? propertyName.slice(1) : propertyName;
  const camelCasedPropertyName = camelize(propertyNameWithoutLeadingHyphen);

  if (hasVendorPrefix && !propertyName.startsWith('-ms-')) {
    return capitalize(camelCasedPropertyName);
  }

  return camelCasedPropertyName;
}

function camelize(value: string): string {
  return value
    .replace(/(?:^\w|[A-Z]|[\b\-_]\w)/g, (word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }

      return word.toUpperCase().replace('-', '').replace('_', '');
    })
    .replace(/\s+/g, '');
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function convertSvgFileNameToReactComponentName(svgFileName: string): string {
  const svgFileNameWithoutExtension = svgFileName.replace(/\.svg$/, '');

  return capitalize(camelize(svgFileNameWithoutExtension));
}

function convertSvgMarkupToJsx(svgMarkup: string): string {
  return svgMarkup.replace(/<(\w+)([^>]*)\/?>/g, (_match, tagName, attributes) => {
    const jsxAttributes = convertAttributesToJsx(attributes);
    const attributeSeparator = isNonEmptyString(jsxAttributes) ? ' ' : '';

    return `<${tagName}${attributeSeparator}${jsxAttributes}>`;
  });
}

export {convertSvgFileNameToReactComponentName, convertSvgMarkupToJsx};
