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

import ko from 'knockout';
import {AssetRemoteData} from 'Repositories/assets/AssetRemoteData';
import {isValidAsset} from 'Util/ValidationUtil';

export class TeamEntity {
  creator?: string;
  /** Team icon (asset ID) */
  icon: string;
  /** Team icon (asset key) */
  iconKey?: string;
  id?: string;
  name: ko.Observable<string>;

  constructor(id?: string) {
    this.creator = undefined;
    this.icon = '';
    this.iconKey = undefined;
    this.id = id;
    this.name = ko.observable('');
  }

  getIconResource(teamDomain?: string): AssetRemoteData | void {
    let hasIcon = false;

    try {
      hasIcon = !!this.icon && isValidAsset(this.icon);
    } catch (error) {
      // ignore error
    }

    if (hasIcon && teamDomain) {
      return new AssetRemoteData({assetKey: this.icon, assetDomain: teamDomain});
    }
  }
}
