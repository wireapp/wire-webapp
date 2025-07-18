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

import React from 'react';

import type {Location} from 'Repositories/entity/message/Location';
import {t} from 'Util/LocalizerUtil';
import {getMapsUrl} from 'Util/LocationUtil';

export interface LocationAssetProps {
  asset: Location;
}

const LocationAsset: React.FC<LocationAssetProps> = ({asset}) => {
  const {latitude, longitude, name, zoom} = asset;
  const mapsUrl = getMapsUrl(parseFloat(latitude), parseFloat(longitude), name, zoom);

  return (
    <>
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
    </>
  );
};

export {LocationAsset};
