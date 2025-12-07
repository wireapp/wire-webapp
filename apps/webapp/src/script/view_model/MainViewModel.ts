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

import type {AssetRepository} from 'Repositories/assets/AssetRepository';
import type {AudioRepository} from 'Repositories/audio/AudioRepository';
import type {BackupRepository} from 'Repositories/backup/BackupRepository';
import type {CallingRepository} from 'Repositories/calling/CallingRepository';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import type {ClientRepository} from 'Repositories/client';
import type {ConnectionRepository} from 'Repositories/connection/ConnectionRepository';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {MessageRepository} from 'Repositories/conversation/MessageRepository';
import type {CryptographyRepository} from 'Repositories/cryptography/CryptographyRepository';
import type {EventRepository} from 'Repositories/event/EventRepository';
import type {GiphyRepository} from 'Repositories/extension/GiphyRepository';
import type {IntegrationRepository} from 'Repositories/integration/IntegrationRepository';
import type {LifeCycleRepository} from 'Repositories/LifeCycleRepository/LifeCycleRepository';
import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {MediaStreamHandler} from 'Repositories/media/MediaStreamHandler';
import type {NotificationRepository} from 'Repositories/notification/NotificationRepository';
import type {PreferenceNotificationRepository} from 'Repositories/notification/PreferenceNotificationRepository';
import type {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import type {SearchRepository} from 'Repositories/search/SearchRepository';
import type {SelfRepository} from 'Repositories/self/SelfRepository';
import type {StorageRepository} from 'Repositories/storage';
import type {TeamRepository} from 'Repositories/team/TeamRepository';
import type {EventTrackingRepository} from 'Repositories/tracking/EventTrackingRepository';
import type {UserRepository} from 'Repositories/user/UserRepository';
import {UserState} from 'Repositories/user/UserState';
import {container} from 'tsyringe';

import {ActionsViewModel} from './ActionsViewModel';
import {CallingViewModel} from './CallingViewModel';
import {ContentViewModel} from './ContentViewModel';
import {ListViewModel} from './ListViewModel';

import {Core} from '../service/CoreSingleton';
import type {ServerTimeHandler} from '../time/serverTimeHandler';

export interface ViewModelRepositories {
  asset: AssetRepository;
  audio: AudioRepository;
  backup: BackupRepository;
  calling: CallingRepository;
  cells: CellsRepository;
  client: ClientRepository;
  connection: ConnectionRepository;
  conversation: ConversationRepository;
  cryptography: CryptographyRepository;
  event: EventRepository;
  eventTracker: EventTrackingRepository;
  giphy: GiphyRepository;
  integration: IntegrationRepository;
  lifeCycle: LifeCycleRepository;
  message: MessageRepository;
  notification: NotificationRepository;
  preferenceNotification: PreferenceNotificationRepository;
  properties: PropertiesRepository;
  search: SearchRepository;
  serverTime: ServerTimeHandler;
  storage: StorageRepository;
  team: TeamRepository;
  user: UserRepository;
  self: SelfRepository;
}

export class MainViewModel {
  actions: ActionsViewModel;
  calling: CallingViewModel;
  content: ContentViewModel;
  list: ListViewModel;
  private readonly core = container.resolve(Core);

  static get CONFIG() {
    return {
      PANEL: {
        BREAKPOINT: 1000,
        WIDTH: 304,
      },
    };
  }

  get isFederated() {
    return this.core.backendFeatures.isFederated;
  }

  constructor(repositories: ViewModelRepositories) {
    const userState = container.resolve(UserState);
    const mediaDevicesHandler = container.resolve(MediaDevicesHandler);
    const mediaStreamHandler = container.resolve(MediaStreamHandler);

    this.actions = new ActionsViewModel(
      repositories.self,
      repositories.cells,
      repositories.connection,
      repositories.conversation,
      repositories.integration,
      repositories.message,
      userState,
      this,
    );

    this.calling = new CallingViewModel(
      repositories.calling,
      repositories.audio,
      mediaDevicesHandler,
      mediaStreamHandler,
      repositories.team,
      repositories.properties,
      userState.self,
    );
    this.content = new ContentViewModel(this, repositories);
    this.list = new ListViewModel(this, repositories);
  }
}
