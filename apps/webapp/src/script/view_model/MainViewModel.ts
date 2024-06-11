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

import {ActionsViewModel} from './ActionsViewModel';
import {CallingViewModel} from './CallingViewModel';
import {ContentViewModel} from './ContentViewModel';
import {ListViewModel} from './ListViewModel';

import type {AssetRepository} from '../assets/AssetRepository';
import type {AudioRepository} from '../audio/AudioRepository';
import type {BackupRepository} from '../backup/BackupRepository';
import type {CallingRepository} from '../calling/CallingRepository';
import type {ClientRepository} from '../client';
import type {ConnectionRepository} from '../connection/ConnectionRepository';
import type {ConversationRepository} from '../conversation/ConversationRepository';
import type {MessageRepository} from '../conversation/MessageRepository';
import type {CryptographyRepository} from '../cryptography/CryptographyRepository';
import type {EventRepository} from '../event/EventRepository';
import type {GiphyRepository} from '../extension/GiphyRepository';
import type {IntegrationRepository} from '../integration/IntegrationRepository';
import type {MediaRepository} from '../media/MediaRepository';
import type {NotificationRepository} from '../notification/NotificationRepository';
import type {PreferenceNotificationRepository} from '../notification/PreferenceNotificationRepository';
import type {PermissionRepository} from '../permission/PermissionRepository';
import type {PropertiesRepository} from '../properties/PropertiesRepository';
import type {SearchRepository} from '../search/SearchRepository';
import type {SelfRepository} from '../self/SelfRepository';
import {Core} from '../service/CoreSingleton';
import type {StorageRepository} from '../storage';
import type {TeamRepository} from '../team/TeamRepository';
import type {ServerTimeHandler} from '../time/serverTimeHandler';
import type {EventTrackingRepository} from '../tracking/EventTrackingRepository';
import type {UserRepository} from '../user/UserRepository';
import {UserState} from '../user/UserState';

export interface ViewModelRepositories {
  asset: AssetRepository;
  audio: AudioRepository;
  backup: BackupRepository;
  calling: CallingRepository;
  client: ClientRepository;
  connection: ConnectionRepository;
  conversation: ConversationRepository;
  cryptography: CryptographyRepository;
  event: EventRepository;
  eventTracker: EventTrackingRepository;
  giphy: GiphyRepository;
  integration: IntegrationRepository;
  media: MediaRepository;
  message: MessageRepository;
  notification: NotificationRepository;
  permission: PermissionRepository;
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

    this.actions = new ActionsViewModel(
      repositories.self,
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
      repositories.media.devicesHandler,
      repositories.media.streamHandler,
      repositories.permission,
      repositories.team,
      repositories.properties,
      userState.self,
    );
    this.content = new ContentViewModel(this, repositories);
    this.list = new ListViewModel(this, repositories);
  }
}
