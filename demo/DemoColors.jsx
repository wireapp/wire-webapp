/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

/** @jsx jsx */
import {COLOR, Container, H1, H2, Line} from '@wireapp/react-ui-kit';
import Color from 'color';
import React from 'react';
import {jsx} from '@emotion/core';

const colorElementStyle = props => ({
  '&::after': {
    alignItems: 'center',
    color: '#fff',
    content: 'attr(data-text)',
    display: 'flex',
    fontSize: '10px',
    fontWeight: 600,
    height: '100%',
    justifyContent: 'center',
    opacity: 0,
    position: 'absolute',
    textAlign: 'center',
    textShadow: '#000 0 0 2px',
    transform: 'scale(1.2)',
    transition: 'all 0.2s ease-in-out',
    whiteSpace: 'pre-wrap',
    width: '100%',
    zIndex: 1,
  },
  '&:hover::after': {
    opacity: 1,
    transform: 'scale(1)',
  },
  backgroundColor: props.backgroundColor,
  border: '1px solid black',
  borderRadius: '40px',
  display: 'inline-block',
  height: '80px',
  position: 'relative',
  width: '80px',
});

const ColorElement = ({name, value, alpha, backgroundColor, ...props}) => (
  <div
    css={colorElementStyle({backgroundColor})}
    data-text={`${name}\n${value}${alpha ? `\nα: ${alpha}` : ''}`}
    {...props}
  />
);

export class DemoColors extends React.PureComponent {
  renderColor(name) {
    const color = Color(COLOR[name]);
    const value = color.hex().toString();
    const digits = 2;
    const alpha = color.alpha() < 1 ? color.alpha().toFixed(digits) : 0;

    return (
      <ColorElement
        onClick={() => navigator.clipboard.writeText(alpha ? color.toString() : value)}
        key={name}
        name={name}
        backgroundColor={COLOR[name]}
        value={value}
        alpha={alpha}
      />
    );
  }

  render() {
    const baseColors = ['BLUE', 'GRAY', 'GREEN', 'ORANGE', 'RED', 'YELLOW'];
    const additionalColors = ['WHITE', 'BLACK', 'LINK', 'TEXT', 'ICON', 'DISABLED'];
    const allColors = [...baseColors, ...additionalColors];
    const steps = [];
    const percent = 100;
    const stepSize = 8;
    for (let index = stepSize; index < percent; index += stepSize) {
      steps.push(index);
    }
    return (
      <Container>
        <Line />
        <H1>Colors</H1>
        <Container>
          <H2>Base Colors </H2>
          {allColors.map(this.renderColor)}
          <H2>Darken</H2>
          {baseColors.map(color => (
            <Container key={color}>{steps.map(step => this.renderColor(`${color}_DARKEN_${step}`))}</Container>
          ))}
          <H2>Lighten</H2>
          {baseColors.map(color => (
            <Container key={color}>{steps.map(step => this.renderColor(`${color}_LIGHTEN_${step}`))}</Container>
          ))}
          <H2>Opaque</H2>
          {baseColors.map(color => (
            <Container
              key={color}
              style={{
                backgroundImage:
                  "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAL0lEQVQ4T2N88ODBfwY8QEFBgRGfPOOoAQzDIQzwxTFIjlA0400kowZAgnfwByIAPbI9Ca+UKQsAAAAASUVORK5CYII=')",
              }}
            >
              {steps.map(step => this.renderColor(`${color}_OPAQUE_${step}`))}
            </Container>
          ))}
        </Container>
      </Container>
    );
  }
}
