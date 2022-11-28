/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {CSSObject} from '@emotion/react/dist/emotion-react.cjs';

import {Theme} from '../Layout';
import {manySelectors} from '../util';

const thumbSelectors = ['&::-webkit-slider-thumb', '&::-moz-range-thumb', '&::-ms-thumb'];
const sliderSelectors = ['&::-webkit-slider-runnable-track', '&::-moz-range-track', '&::-ms-track'];

export const rangeStyles = (
  backgroundSize: string,
  value: number,
  listLength: number,
  isCustomSlider: boolean,
  theme: Theme,
): CSSObject => {
  const firstOptionThumbPosition = `calc(((100% - 10px) / (${listLength} * 2) - 4px) / 2)`;
  const lastOptionThumbPosition = `calc(((100% - 12px) / (${listLength} * 2) - 6px) / 2)`;

  const isFirstOption = value === 0;
  const isLastOption = value === listLength;

  return {
    appearance: 'none',
    width: '100%',
    height: '8px',
    backgroundImage: `linear-gradient(${theme.general.primaryColor}, ${theme.general.primaryColor})`,
    backgroundColor: theme.Input.borderHover,
    backgroundSize: backgroundSize || '0% 100%',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '8px',
    marginBlock: '10px',
    zIndex: '1',
    position: 'relative',

    ...manySelectors(thumbSelectors, {
      '-webkit-appearance': 'none',
      height: '28px',
      width: '10px',
      borderRadius: '4px',
      background: theme.Button.primaryActiveBorder,
      cursor: 'pointer',
      border: 'none',
      boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.25);',
      position: 'relative',
      top: '-9px',
      zIndex: '2',
      ...(isCustomSlider && isFirstOption && {left: firstOptionThumbPosition}),
      ...(isCustomSlider && isLastOption && {right: lastOptionThumbPosition}),
    }),

    ...manySelectors(sliderSelectors, {
      '-webkit-appearance': 'none',
      boxShadow: 'none',
      background: 'transparent',
      height: '8px',
      width: '100%',
    }),
  };
};

export const headingStyle = (listLength: number, theme: Theme): CSSObject => {
  const optionWidth = `calc((100% - 12px) / ${listLength})`;

  return {
    color: theme.general.color,
    fontSize: theme.fontSizes.medium,
    fontWeight: '400',
    lineHeight: '1.2em',
    width: optionWidth,
    textAlign: 'center',

    '&:first-of-type': {
      width: `calc((100% - 10px) / (${listLength} * 2) + (10px / 2))`,
    },

    '&:last-of-type': {
      width: `calc((100% - 12px) / (${listLength} * 2) + 6px)`,
    },
  };
};

export const dataListOption = (listLength: number, theme: Theme): CSSObject => {
  const optionWidth = `calc((100% - 12px) / ${listLength})`;

  return {
    color: theme.Input.labelColor,
    fontSize: '12px',
    fontWeight: '400',
    lineHeight: '1.2em',

    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '20px',

    position: 'relative',
    zIndex: '0',

    option: {
      display: 'inline-block',
      width: optionWidth,
      textAlign: 'center',
      padding: '0',
      position: 'relative',

      '&:first-of-type': {
        width: `calc((100% - 10px) / (${listLength} * 2) + (10px / 2))`,
      },

      '&:last-of-type': {
        width: `calc((100% - 12px) / (${listLength} * 2) + 6px)`,
      },

      '&::before': {
        content: '""',
        position: 'absolute',
        borderLeft: `2px solid ${theme.Select.borderColor}`,
        width: '2px',
        height: '27px',
        top: '-37px',
        left: '50%',
      },
    },
  };
};

export const containerStyles: CSSObject = {
  width: '100%',
  position: 'relative',
  marginTop: '20px',
};
