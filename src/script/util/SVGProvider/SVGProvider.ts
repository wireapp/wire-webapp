/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {iconFileNames} from '../../generated/iconFileNames';

type ElementType<T extends ReadonlyArray<unknown>> = T extends ReadonlyArray<infer ElementType> ? ElementType : never;
type SVGFileNameWithExtension = ElementType<typeof iconFileNames>;

export type SVGIconName = SVGFileNameWithExtension extends `${infer Name}.svg` ? Name : never;
export type SVGProvider = Record<SVGIconName, Document>;

const parser = new DOMParser();

const createSVGs = (fileNames: typeof iconFileNames): SVGProvider => {
  return fileNames.reduce((acc, iconFileName) => {
    const iconName = iconFileName.substring(iconFileName.lastIndexOf('/') + 1).replace(/\.svg$/i, '');
    const svgString = require(`Resource/image/icon/${iconFileName}`);
    return {...acc, [iconName]: parser.parseFromString(svgString, 'image/svg+xml')};
  }, {} as SVGProvider);
};

const svgs = createSVGs(iconFileNames);

const getAllSVGs = () => svgs;
const getSVG = (iconName: SVGIconName) => svgs[iconName];

export {getAllSVGs, getSVG};
