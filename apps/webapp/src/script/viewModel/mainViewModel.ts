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

import {container} from 'tsyringe';

import type {AssetRepository} from 'Repositories/assets/assetRepository';
import type {AudioRepository} from 'Repositories/audio/audioRepository';
import type {BackupRepository} from 'Repositories/backup/backupRepository';
import type {CallingRepository} from 'Repositories/calling/callingRepository';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import type {ClientRepository} from 'Repositories/client';
import type {ConnectionRepository} from 'Repositories/connection/connectionRepository';
import type {ConversationRepository} from 'Repositories/conversation/conversationRepository';
import type {MessageRepository} from 'Repositories/conversation/messageRepository';
import type {CryptographyRepository} from 'Repositories/cryptography/cryptographyRepository';
import type {EventRepository} from 'Repositories/event/eventRepository';
import type {GiphyRepository} from 'Repositories/extension/giphyRepository';
import type {IntegrationRepository} from 'Repositories/integration/integrationRepository';
import type {LifeCycleRepository} from 'Repositories/lifeCycleRepository/lifeCycleRepository';
import {MediaDevicesHandler} from 'Repositories/media/mediaDevicesHandler';
import {MediaStreamHandler} from 'Repositories/media/mediaStreamHandler';
import type {NotificationRepository} from 'Repositories/notification/notificationRepository';
import type {PreferenceNotificationRepository} from 'Repositories/notification/preferenceNotificationRepository';
import type {PropertiesRepository} from 'Repositories/properties/propertiesRepository';
import type {SearchRepository} from 'Repositories/search/searchRepository';
import type {SelfRepository} from 'Repositories/self/selfRepository';
import type {StorageRepository} from 'Repositories/storage';
import type {TeamRepository} from 'Repositories/team/teamRepository';
import type {EventTrackingRepository} from 'Repositories/tracking/eventTrackingRepository';
import type {UserRepository} from 'Repositories/user/userRepository';
import {UserState} from 'Repositories/user/userState';

import {ActionsViewModel} from './actionsViewModel';
import {CallingViewModel} from './callingViewModel';
import {ContentViewModel} from './contentViewModel';
import {ListViewModel} from './listViewModel';

import {Core} from '../service/coreSingleton';
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
