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

/** @jsx jsx */
import {CSSObject, jsx} from '@emotion/react';
import React, {FC, forwardRef} from 'react';
import {TextProps} from '../Text';
import {Theme} from '../Layout';
import InputLabel from './InputLabel';
import {
  getImageCropZoomInputStyles,
  getValueLabelStyles,
  rangeInputWrapperStyles,
  ValueLabelPosition,
} from './RangeInput.styles';

export interface RangeInputProps<T = HTMLInputElement> extends TextProps<T> {
  label?: string;
  minValueLabel?: string;
  maxValueLabel?: string;
  wrapperCSS?: CSSObject;
}

export const RangeInput: FC<RangeInputProps> = forwardRef<HTMLInputElement, RangeInputProps<HTMLInputElement>>(
  (
    {
      id = Math.random().toString(),
      label,
      minValueLabel,
      maxValueLabel,
      min = '0',
      max = '100',
      value = '0',
      onChange,
      wrapperCSS,
      ...inputProps
    },
    ref,
  ) => {
    const minNum = Number(min);
    const maxNum = Number(max);
    const valueNum = Number(value);

    const backgroundSize = `${((valueNum - minNum) * 100) / (maxNum - minNum)}% 100%` as const;

    return (
      <div css={wrapperCSS}>
        {label && <InputLabel htmlFor={id}>{label}</InputLabel>}
        <div css={rangeInputWrapperStyles}>
          {minValueLabel && <span css={getValueLabelStyles(ValueLabelPosition.LEFT)}>{minValueLabel}</span>}
          {maxValueLabel && <span css={getValueLabelStyles(ValueLabelPosition.RIGHT)}>{maxValueLabel}</span>}
          <input
            ref={ref}
            css={(theme: Theme) => getImageCropZoomInputStyles(theme, backgroundSize)}
            id={id}
            name={id}
            min={min}
            max={max}
            value={value}
            onChange={onChange}
            type="range"
            {...inputProps}
          />
        </div>
      </div>
    );
  },
);
