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

import {t} from 'Util/LocalizerUtil';
import {formatTimestamp} from 'Util/TimeUtil';
import {amplify} from 'amplify';
import ko from 'knockout';
import {WebAppEvents} from '@wireapp/webapp-events';
import {ContentViewModel} from '../ContentViewModel';
import {sortUserDevices} from 'Components/userDevices';
import {MainViewModel} from '../MainViewModel';
import {CryptographyRepository} from '../../cryptography/CryptographyRepository';
import {User} from '../../entity/User';
import {ClientEntity} from '../../client/ClientEntity';
import {ActionsViewModel} from '../ActionsViewModel';
import {PreferencesDeviceDetailsViewModel} from './PreferencesDeviceDetailsViewModel';
import {container} from 'tsyringe';
import {ClientState} from '../../client/ClientState';
import {UserState} from '../../user/UserState';

export class PreferencesDevicesViewModel {
  private readonly actionsViewModel: ActionsViewModel;
  private readonly preferencesDeviceDetails: PreferencesDeviceDetailsViewModel;
  readonly currentClient: ko.Observable<ClientEntity>;
  readonly displayClientId: ko.PureComputed<string[]>;
  readonly activationDate: ko.Observable<string>;
  readonly devices: ko.PureComputed<ClientEntity[]>;
  readonly localFingerprint: ko.ObservableArray<string>;
  private readonly selfUser: ko.Observable<User>;
  readonly isSSO: ko.PureComputed<boolean>;

  constructor(
    mainViewModel: MainViewModel,
    contentViewModel: ContentViewModel,
    private readonly cryptographyRepository: CryptographyRepository,
    private readonly clientState = container.resolve(ClientState),
    private readonly userState = container.resolve(UserState),
  ) {
    this.actionsViewModel = mainViewModel.actions;
    this.preferencesDeviceDetails = contentViewModel.preferencesDeviceDetails;
    this.currentClient = this.clientState.currentClient;
    this.displayClientId = ko.pureComputed(() => (this.currentClient() ? this.currentClient().formatId() : []));

    this.activationDate = ko.observable();
    // all clients except the current client
    this.devices = ko.pureComputed(() => {
      const clients = this.clientState.clients().filter(clientEntity => clientEntity.id !== this.currentClient().id);
      return sortUserDevices(clients);
    });
    this.localFingerprint = ko.observableArray([]);
    this.selfUser = this.userState.self;
    this.isSSO = ko.pureComputed(() => this.selfUser() && this.selfUser().isSingleSignOn);
  }

  clickOnShowDevice = (clientEntity: ClientEntity): void => {
    this.preferencesDeviceDetails.device(clientEntity);
    amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS);
  };

  clickOnRemoveDevice = (clientEntity: ClientEntity, event: MouseEvent): void => {
    this.actionsViewModel.deleteClient(clientEntity);
    event.stopPropagation();
  };

  updateDeviceInfo = (): void => {
    if (this.currentClient() && !this.localFingerprint().length) {
      const date = formatTimestamp(this.currentClient().time);
      this.activationDate(t('preferencesDevicesActivatedOn', {date}));
      this.localFingerprint(this.cryptographyRepository.getLocalFingerprint());
    }
  };
}
