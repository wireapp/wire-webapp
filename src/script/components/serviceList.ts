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
import {noop} from 'Util/util';

import {ParticipantAvatar} from 'Components/participantAvatar';

import 'Components/list/participantItem';
import {ServiceEntity} from '../integration/ServiceEntity';

interface ServiceListParams {
  isSearching?: ko.PureComputed<boolean>;
  services: ko.ObservableArray<ServiceEntity>;
  mode: string;
  click: () => void;
  noUnderline: boolean;
  arrow: boolean;
}

class ServiceList {
  arrow: boolean;
  avatarSize: string;
  cssClasses: ko.PureComputed<string>;
  isCompactMode: boolean;
  isDefaultMode: boolean;
  isSearching: ko.PureComputed<boolean> | (() => void);
  mode: string;
  noUnderline: boolean;
  onClick: () => void;
  services: ko.ObservableArray<ServiceEntity>;

  static get MODE() {
    return {
      COMPACT: 'ServiceList.MODE.COMPACT',
      DEFAULT: 'ServiceList.MODE.DEFAULT',
    };
  }

  constructor(params: ServiceListParams) {
    this.isSearching = params.isSearching || noop;
    this.mode = params.mode || ServiceList.MODE.DEFAULT;
    this.onClick = params.click;
    this.services = params.services;
    this.noUnderline = params.noUnderline;
    this.arrow = params.arrow;

    this.isCompactMode = this.mode === ServiceList.MODE.COMPACT;
    this.isDefaultMode = this.mode === ServiceList.MODE.DEFAULT;

    this.avatarSize = this.isCompactMode ? ParticipantAvatar.SIZE.LARGE : ParticipantAvatar.SIZE.SMALL;

    this.cssClasses = ko.pureComputed(() => (this.isCompactMode ? 'search-list-sm' : 'search-list-lg'));
  }
}

ko.components.register('service-list', {
  template: `
    <div class="search-list" data-bind="css: cssClasses(), foreach: services">
      <participant-item params="participant: $data" data-bind="click: $parent.onClick, css: {'no-underline': $parent.noUnderline, 'show-arrow': $parent.arrow}"></participant-item>
    </div>
    <!-- ko if: isSearching() && !services().length -->
      <div class="no-results" data-bind="text: t('searchListNoMatches')"></div>
    <!-- /ko -->
  `,
  viewModel: ServiceList,
});
