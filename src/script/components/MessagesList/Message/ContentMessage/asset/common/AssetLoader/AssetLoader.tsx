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

import {TabIndex} from '@wireapp/react-ui-kit';

import {CloseIcon} from 'Components/Icon';
import {handleKeyDown, KEY} from 'Util/KeyboardUtil';

interface AssetLoaderProps {
  large?: boolean;
  loadProgress: number;
  onCancel: () => void;
}

const AssetLoader = ({large, loadProgress, onCancel}: AssetLoaderProps) => {
  const elementScale = large ? 2 : 1;
  const progress = `${loadProgress * elementScale} ${100 * elementScale}`;
  const viewBoxSize = 32 * elementScale;
  const viewBox = `0 0 ${viewBoxSize} ${viewBoxSize}`;

  const onClick = (event: React.UIEvent) => {
    event.bubbles = false;
    onCancel();
  };

  return (
    <div
      role="button"
      tabIndex={TabIndex.FOCUSABLE}
      className="media-button"
      onClick={onClick}
      onKeyDown={event => handleKeyDown({event, callback: () => onClick(event), keys: [KEY.ENTER, KEY.SPACE]})}
      data-uie-name="status-loading-media"
    >
      <svg aria-hidden="true" viewBox={viewBox} data-uie-name="asset-loader-svg">
        <circle
          className="accent-stroke"
          style={{strokeDasharray: progress}}
          r="50%"
          cx="50%"
          cy="50%"
          data-uie-name="asset-loader-circle"
        />
      </svg>

      <div className="media-button__icon">
        <CloseIcon />
      </div>
    </div>
  );
};

export {AssetLoader};
