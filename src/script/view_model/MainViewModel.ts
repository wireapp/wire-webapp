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

import {amplify} from 'amplify';
import ko from 'knockout';
import {container} from 'tsyringe';

import {getLogger, Logger} from 'Util/Logger';

import {ActionsViewModel} from './ActionsViewModel';
import {CallingViewModel} from './CallingViewModel';
import {FaviconViewModel} from './FaviconViewModel';

import type {AssetRepository} from '../assets/AssetRepository';
import type {AudioRepository} from '../audio/AudioRepository';
import type {BackupRepository} from '../backup/BackupRepository';
import type {CallingRepository} from '../calling/CallingRepository';
import type {ClientRepository} from '../client/ClientRepository';
import type {ConnectionRepository} from '../connection/ConnectionRepository';
import type {ConversationRepository} from '../conversation/ConversationRepository';
import type {MessageRepository} from '../conversation/MessageRepository';
import type {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {Message} from '../entity/message/Message';
import type {User} from '../entity/User';
import type {EventRepository} from '../event/EventRepository';
import type {GiphyRepository} from '../extension/GiphyRepository';
import type {IntegrationRepository} from '../integration/IntegrationRepository';
import type {MediaRepository} from '../media/MediaRepository';
import type {Multitasking, NotificationRepository} from '../notification/NotificationRepository';
import type {PreferenceNotificationRepository} from '../notification/PreferenceNotificationRepository';
import type {PermissionRepository} from '../permission/PermissionRepository';
import type {PropertiesRepository} from '../properties/PropertiesRepository';
import type {SearchRepository} from '../search/SearchRepository';
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
}

export class MainViewModel {
  actions: ActionsViewModel;
  calling: CallingViewModel;
  favicon: FaviconViewModel;
  logger: Logger;
  multitasking: Multitasking;
  selfUser: ko.Observable<User>;
  userRepository: UserRepository;
  isFederated: boolean;
  messageEntity: Message | undefined;
  showLikes: boolean;
  highlightedUsers: User[];
  private readonly userState: UserState;

  static get CONFIG() {
    return {
      PANEL: {
        BREAKPOINT: 1000,
        WIDTH: 304,
      },
    };
  }

  constructor(repositories: ViewModelRepositories) {
    this.userRepository = repositories.user;
    this.logger = getLogger('MainViewModel');

    this.userState = container.resolve(UserState);
    this.isFederated = container.resolve(Core).backendFeatures.isFederated;

    this.multitasking = {
      isMinimized: ko.observable(true),
    };

    this.selfUser = this.userState.self;

    this.messageEntity = undefined;
    this.showLikes = false;

    this.highlightedUsers = [];

    this.actions = new ActionsViewModel(
      this,
      repositories.client,
      repositories.connection,
      repositories.conversation,
      repositories.integration,
      repositories.message,
    );

    this.calling = new CallingViewModel(
      repositories.calling,
      repositories.audio,
      repositories.media.devicesHandler,
      repositories.media.streamHandler,
      repositories.permission,
      repositories.team,
      repositories.properties,
      this.selfUser,
      this.multitasking,
    );

    this.favicon = new FaviconViewModel(amplify);

    // Prevent Chrome (and Electron) from pushing the content out of the
    // viewport when using form elements (e.g. in the preferences)
    document.addEventListener('scroll', () => window.scrollTo(0, 0));
  }
}
