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

import React, {Fragment} from 'react';

import {getMapsUrl} from 'Util/LocationUtil';
import {registerReactComponent} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import type {Location} from '../../entity/message/Location';

export interface LocationAssetProps {
  asset: Location;
}

const LocationAsset: React.FC<LocationAssetProps> = ({asset}) => {
  const {latitude, longitude, name, zoom} = asset;
  const mapsUrl = getMapsUrl(parseFloat(latitude), parseFloat(longitude), name, zoom);

  return (
    <Fragment>
      <div className="location-asset-icon icon-location" />
      <div className="location-asset-title" data-uie-name="location-name">
        {asset.name}
      </div>
      <a
        className="label-xs accent-text"
        data-uie-name="location-asset-link"
        href={mapsUrl}
        rel="nofollow noopener noreferrer"
        target="_blank"
      >
        {t('conversationLocationLink')}
      </a>
    </Fragment>
  );
};

export default LocationAsset;

registerReactComponent('location-asset', {
  component: LocationAsset,
  template: '<div class="location-asset" data-bind="react: {asset}"></div>',
});
