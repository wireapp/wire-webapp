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

import {Logger, getLogger} from 'Util/Logger';

import {BasePanelViewModel, PanelViewModelProps} from './BasePanelViewModel';
import type {ServiceEntity} from '../../integration/ServiceEntity';
import type {ActionsViewModel} from '../ActionsViewModel';
import type {IntegrationRepository} from '../../integration/IntegrationRepository';
import type {User} from '../../entity/User';
import type {PanelParams} from '../PanelViewModel';

export class GroupParticipantServiceViewModel extends BasePanelViewModel {
  integrationRepository: IntegrationRepository;
  actionsViewModel: ActionsViewModel;
  logger: Logger;
  selectedParticipant: ko.Observable<User>;
  selectedService: ko.Observable<ServiceEntity>;
  isAddMode: ko.Observable<boolean>;
  conversationInTeam: ko.PureComputed<boolean>;
  selectedInConversation: ko.PureComputed<boolean>;
  selfIsActiveParticipant: ko.PureComputed<boolean>;
  showActions: ko.PureComputed<boolean>;
  constructor(params: PanelViewModelProps) {
    super(params);

    const {mainViewModel, repositories} = params;

    this.integrationRepository = repositories.integration;
    this.actionsViewModel = mainViewModel.actions;

    this.logger = getLogger('GroupParticipantServiceViewModel');

    this.selectedParticipant = ko.observable(undefined);
    this.selectedService = ko.observable(undefined);

    this.isAddMode = ko.observable(false);

    this.conversationInTeam = ko.pureComputed(() => this.activeConversation()?.inTeam());

    this.selectedInConversation = ko.pureComputed(() => {
      if (this.isVisible() && this.activeConversation()) {
        const participatingUserIds = this.activeConversation().participating_user_ids();
        return participatingUserIds.some(id => this.selectedParticipant().id === id);
      }
      return false;
    });

    this.selfIsActiveParticipant = ko.pureComputed(() => {
      return this.isVisible() ? this.activeConversation().isActiveParticipant() : false;
    });

    this.showActions = ko.pureComputed(() => {
      return this.selfIsActiveParticipant() && this.selectedInConversation() && this.conversationInTeam();
    });
  }

  getElementId(): string {
    return 'group-participant-service';
  }

  getEntityId(): string {
    return this.selectedParticipant().id;
  }

  clickOnAdd(): void {
    this.integrationRepository.addService(this.activeConversation(), this.selectedService());
    this.onGoToRoot();
  }

  clickToOpen(): void {
    this.actionsViewModel.open1to1ConversationWithService(this.selectedService());
  }

  async clickToRemove(): Promise<void> {
    await this.actionsViewModel.removeFromConversation(this.activeConversation(), this.selectedParticipant());
    this.onGoBack();
  }

  initView({entity: user, addMode = false}: PanelParams): void {
    const serviceEntity = ko.unwrap(user as User);
    this.selectedParticipant(serviceEntity);
    this.selectedService(undefined);
    this.isAddMode(addMode);
    this._showService(this.selectedParticipant());
  }

  private readonly _showService = async (entity: User): Promise<void> => {
    const serviceEntity = await this.integrationRepository.getServiceFromUser(entity);
    this.selectedService(serviceEntity);
    this.integrationRepository.addProviderNameToParticipant(serviceEntity);
  };
}
