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

import type {CSSProperties} from 'react';

interface ProgressProps {
  ariaLabel?: string;
  width: number;
  percent: number;
  error?: boolean;
  style?: CSSProperties;
}

export const ProgressBar = ({ariaLabel, width, percent, error, style}: ProgressProps) => {
  const normalizedPercent = Math.min(100, Math.max(0, Math.floor(percent)));
  const progress = (percent / 100) * width;

  return (
    <div
      data-uie-name="element-progess-bar"
      role="progressbar"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={normalizedPercent}
      aria-valuetext={`${normalizedPercent}%`}
      style={{
        alignSelf: 'center',
        backgroundColor: 'white',
        borderRadius: '5px',
        height: '8px',
        marginTop: '8px',
        width: width,
        ...style,
      }}
    >
      <div
        style={{
          backgroundColor: error === true ? 'red' : 'blue',
          borderRadius: '5px',
          height: 'inherit',
          transition: 'ease-in',
          width: `${progress}px`,
        }}
      />
    </div>
  );
};
