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

import {COLOR_V2} from './colors-v2';

const meta: Meta = {
  title: 'Identity/Colors/V2',
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
      {Object.entries(colors).map(([key, value]) => (
        <ColorBox key={key} color={value} name={key} />
      ))}
    </div>
  </div>
);

const getColorScale = (prefix: string) => {
  const lightColors = Object.entries(COLOR_V2)
    .filter(([key]) => key.includes(`${prefix}_LIGHT_`))
    .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});

  const darkColors = Object.entries(COLOR_V2)
    .filter(([key]) => key.includes(`${prefix}_DARK_`))
    .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});

  return {lightColors, darkColors};
};

export const BaseColors = () => {
  const lightColors = Object.entries(COLOR_V2)
    .filter(([key]) => key.includes('LIGHT_500'))
    .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});

  const darkColors = Object.entries(COLOR_V2)
    .filter(([key]) => key.includes('DARK_500'))
    .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});

  return (
    <>
      <ColorSection title="Base Light Colors" colors={lightColors} />
      <ColorSection title="Base Dark Colors" colors={darkColors} />
    </>
  );
};

export const GrayScale = () => {
  const colors = Object.entries(COLOR_V2)
    .filter(([key]) => key.includes('GRAY_'))
    .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});

  return <ColorSection title="Gray Scale" colors={colors} />;
};

export const BlueScale = () => {
  const {lightColors, darkColors} = getColorScale('BLUE');
  return (
    <>
      <ColorSection title="Blue Scale (Light)" colors={lightColors} />
      <ColorSection title="Blue Scale (Dark)" colors={darkColors} />
    </>
  );
};

export const GreenScale = () => {
  const {lightColors, darkColors} = getColorScale('GREEN');
  return (
    <>
      <ColorSection title="Green Scale (Light)" colors={lightColors} />
      <ColorSection title="Green Scale (Dark)" colors={darkColors} />
    </>
  );
};

export const TurquoiseScale = () => {
  const {lightColors, darkColors} = getColorScale('TURQUOISE');
  return (
    <>
      <ColorSection title="Turquoise Scale (Light)" colors={lightColors} />
      <ColorSection title="Turquoise Scale (Dark)" colors={darkColors} />
    </>
  );
};

export const PurpleScale = () => {
  const {lightColors, darkColors} = getColorScale('PURPLE');
  return (
    <>
      <ColorSection title="Purple Scale (Light)" colors={lightColors} />
      <ColorSection title="Purple Scale (Dark)" colors={darkColors} />
    </>
  );
};

export const RedScale = () => {
  const {lightColors, darkColors} = getColorScale('RED');
  return (
    <>
      <ColorSection title="Red Scale (Light)" colors={lightColors} />
      <ColorSection title="Red Scale (Dark)" colors={darkColors} />
    </>
  );
};

export const AmberScale = () => {
  const {lightColors, darkColors} = getColorScale('AMBER');
  return (
    <>
      <ColorSection title="Amber Scale (Light)" colors={lightColors} />
      <ColorSection title="Amber Scale (Dark)" colors={darkColors} />
    </>
  );
};
