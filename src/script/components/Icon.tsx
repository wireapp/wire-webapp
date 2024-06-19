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

import React from 'react';

import {SVGIconFileName, getAllSVGs} from 'Util/SVGProvider';

type RemoveSuffix<S extends string, Suffix extends string> = S extends `${infer P}${Suffix}` ? P : S;

type PascalCase<S extends string> = S extends `${infer F}-${infer R}`
  ? `${Capitalize<F>}${PascalCase<Capitalize<R>>}`
  : Capitalize<S>;

type PascalCaseIconName = PascalCase<RemoveSuffix<SVGIconFileName, '-icon'>>;

type IconProps = React.SVGProps<SVGSVGElement>;

type IconList = Record<PascalCaseIconName, React.FC<IconProps>>;

interface NamedIconProps extends IconProps {
  name: SVGIconFileName;
}

const normalizeIconName = (name: SVGIconFileName): PascalCaseIconName =>
  name
    .replace(/-icon$/, '')
    .replace(/\b\w/g, found => found.toUpperCase())
    .replace(/-/g, '') as PascalCaseIconName;

const createSvgComponent = (svg: HTMLElement, displayName: string): React.FC<IconProps> => {
  const SVGComponent: React.FC<IconProps> = oProps => {
    const viewBox = svg.getAttribute('viewBox');
    if (!viewBox) {
      console.error('Svg icon must have a viewBox attribute');
    }
    const regex = /0 0 (?<width>\d+) (?<height>\d+)/;
    const {width, height} = regex.exec(viewBox).groups;

    const props = {
      height: oProps.height ?? height,
      viewBox,
      width: oProps.width ?? width,
      ...oProps,
    };

    return <svg {...props} aria-hidden="true" dangerouslySetInnerHTML={{__html: svg.innerHTML}} />;
  };
  SVGComponent.displayName = displayName;
  return SVGComponent;
};

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

function typedEntries<T extends {}>(obj: T): Entries<T> {
  return Object.entries(obj) as Entries<T>;
}

const icons = typedEntries(getAllSVGs()).reduce<IconList>(
  (list, [key, svg]) => {
    const name = normalizeIconName(key);
    return Object.assign(list, {[name]: createSvgComponent(svg.documentElement, `Icon.${name}`)});
  },
  {} as Record<PascalCaseIconName, React.FC<IconProps>>,
);

const IconComponent: React.FC<NamedIconProps> = ({name, ...props}) => {
  const componentName = normalizeIconName(name);
  const Component = icons[componentName];
  if (!Component) {
    return null;
  }
  return <Component {...props} />;
};

const Icon = Object.assign(IconComponent, icons);

export {Icon};
