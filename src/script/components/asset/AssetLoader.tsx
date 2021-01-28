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

import React, {Fragment} from 'react';

import {registerReactComponent} from 'Util/ComponentUtil';
import NamedIcon from '../NamedIcon';

export interface AssetLoaderProps {
  large: boolean;
  loadProgress: number;
  onCancel: () => void;
}

const AssetLoader: React.FC<AssetLoaderProps> = ({large, loadProgress, onCancel}) => {
  const elementScale = large ? 2 : 1;
  const progress = `${loadProgress * elementScale} ${100 * elementScale}`;
  const viewBoxSize = 32 * elementScale;
  const viewBox = `0 0 ${viewBoxSize} ${viewBoxSize}`;
  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.bubbles = false;
    onCancel();
  };

  return (
    <Fragment>
      <div className="media-button" onClick={onClick} data-uie-name="status-loading-media">
        <svg viewBox={viewBox} data-uie-name="asset-loader-svg">
          <circle
            className="accent-stroke"
            style={{strokeDasharray: progress}}
            r="50%"
            cx="50%"
            cy="50%"
            data-uie-name="asset-loader-circle"
          ></circle>
        </svg>
        <NamedIcon name="close-icon" className="media-button__icon"></NamedIcon>
      </div>
    </Fragment>
  );
};

export default AssetLoader;

registerReactComponent('asset-loader', {
  component: AssetLoader,
  template: '<div class="asset-loader" data-bind="react: {loadProgress: ko.unwrap(loadProgress)}"></div>',
});
