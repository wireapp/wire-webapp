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

import {AssetRemoteData} from '../assets/AssetRemoteData';
import {assetV3} from '../util/ValidationUtil';
import type {User} from '../entity/User';

export class TeamEntity {
  creator?: string;
  /** Team icon (asset ID) */
  icon: string;
  /** Team icon (asset key) */
  iconKey?: string;
  id?: string;
  members: ko.ObservableArray<User>;
  name: ko.Observable<string>;

  constructor(id?: string) {
    this.creator = undefined;
    this.icon = '';
    this.iconKey = undefined;
    this.members = ko.observableArray([]);
    this.id = id;
    this.name = ko.observable('');
  }

  getIconResource(): AssetRemoteData | void {
    let hasIcon = false;

    try {
      hasIcon = this.icon && assetV3(this.icon);
    } catch (error) {}

    if (hasIcon) {
      return AssetRemoteData.v3(this.icon);
    }
  }
}
