/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {Meta} from '@storybook/react';

import {COLOR} from './colors';

const meta: Meta = {
  title: 'Identity/Colors/V1',
};

export default meta;

interface ColorBoxProps {
  color: string;
  name: string;
}

const ColorBox = ({color, name}: ColorBoxProps) => (
  <div style={{marginBottom: '8px'}}>
    <div
      style={{
        backgroundColor: color,
        border: '1px solid #E5E5E5',
        borderRadius: '4px',
        height: '48px',
        marginBottom: '4px',
        width: '100%',
      }}
    />
    <div style={{fontSize: '12px'}}>
      <strong>{name}</strong>
      <br />
      <code>{color}</code>
    </div>
  </div>
);

const ColorSection = ({title, colors}: {title: string; colors: Record<string, string>}) => (
  <div style={{marginBottom: '32px'}}>
    <h3>{title}</h3>
    <div
      style={{
        display: 'grid',
        gap: '16px',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      }}
    >
      {Object.entries(colors)
        .filter(([, value]) => typeof value === 'string')
        .map(([key, value]) => (
          <ColorBox key={key} color={value} name={key} />
        ))}
    </div>
  </div>
);

export const BaseColors = () => {
  const colors = Object.entries(COLOR)
    .filter(([key, value]) => typeof value === 'string' && !key.includes('_'))
    .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});

  return <ColorSection title="Base Colors" colors={colors} />;
};

export const DarkVariants = () => {
  const colors = Object.entries(COLOR)
    .filter(([key]) => key.includes('DARKEN'))
    .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});

  return <ColorSection title="Dark Variants" colors={colors} />;
};

export const LightVariants = () => {
  const colors = Object.entries(COLOR)
    .filter(([key]) => key.includes('LIGHTEN'))
    .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});

  return <ColorSection title="Light Variants" colors={colors} />;
};

export const OpaqueVariants = () => {
  const colors = Object.entries(COLOR)
    .filter(([key]) => key.includes('OPAQUE'))
    .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});

  return <ColorSection title="Opaque Variants" colors={colors} />;
};

export const ComponentColors = () => {
  const colors = Object.entries(COLOR)
    .filter(([key]) => ['DISABLED', 'ICON', 'LINK', 'TEXT'].includes(key))
    .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});

  return <ColorSection title="Component Colors" colors={colors} />;
};

export const AllColorVariants = () => {
  const baseColors = Object.entries(COLOR)
    .filter(([key, value]) => typeof value === 'string' && !key.includes('_'))
    .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});

  const colorsByBase = Object.keys(baseColors).map(baseColor => {
    const variants = Object.entries(COLOR)
      .filter(([key, value]) => typeof value === 'string' && key.startsWith(baseColor) && key !== baseColor)
      .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});

    return {
      base: baseColor,
      variants: {[baseColor]: baseColors[baseColor], ...variants},
    };
  });

  return (
    <>
      {colorsByBase.map(({base, variants}) => (
        <ColorSection key={base} title={`${base} - All Variants`} colors={variants} />
      ))}
    </>
  );
};
