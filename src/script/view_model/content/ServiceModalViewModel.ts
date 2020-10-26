/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {AVATAR_SIZE} from 'Components/ParticipantAvatar';
import ko from 'knockout';

import type {IntegrationRepository} from '../../integration/IntegrationRepository';
import type {ServiceEntity} from '../../integration/ServiceEntity';
import type {ActionsViewModel} from '../ActionsViewModel';

export class ServiceModalViewModel {
  isVisible: ko.Observable<boolean>;
  service: ko.Observable<ServiceEntity>;
  avatarSize: string;

  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly actionsViewModel: ActionsViewModel,
  ) {
    this.isVisible = ko.observable(false);
    this.service = ko.observable(null);
    this.avatarSize = AVATAR_SIZE.LARGE;
  }

  showService = (service: ServiceEntity) => {
    this.integrationRepository.addProviderNameToParticipant(service);
    this.service(service);
    this.isVisible(true);
  };

  onClosed = () => {
    this.service(null);
  };

  hide = () => {
    this.isVisible(false);
  };

  openService = () => {
    this.isVisible(false);
    this.actionsViewModel.open1to1ConversationWithService(this.service());
  };
}
