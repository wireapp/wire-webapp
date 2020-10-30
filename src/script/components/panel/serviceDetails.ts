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
import {AVATAR_SIZE} from 'Components/ParticipantAvatar';
import type {ServiceEntity} from '../../integration/ServiceEntity';

interface ComponentParams {
  AVATAR_SIZE: AVATAR_SIZE;
  service: ServiceEntity;
}

ko.components.register('panel-service-details', {
  template: `
    <div class="panel-participant">
      <div class="panel-participant__name" data-bind="text: service().name" data-uie-name="status-service-name"></div>
      <div class="panel-participant__provider-name" data-bind="text: service().providerName()" data-uie-name="status-service-provider"></div>
      <participant-avatar params="participant: service, size: AVATAR_SIZE.X_LARGE" data-uie-name="status-profile-picture"></participant-avatar>
      <div class="panel-participant__service-description" data-bind="text: service().description" data-uie-name="status-service-description"></div>
    </div>
  `,
  viewModel: class {
    readonly service: ServiceEntity;
    readonly AVATAR_SIZE: typeof AVATAR_SIZE;

    constructor(params: ComponentParams) {
      this.service = params.service;
      this.AVATAR_SIZE = AVATAR_SIZE;
    }
  },
});
