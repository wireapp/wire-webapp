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

import type {FireAndForgetInvoker} from '@enormora/fire-and-forget';
import {container} from 'tsyringe';

import {ActionsViewModel} from './actionsViewModel';
import {CallingViewModel} from './callingViewModel';
import {ContentViewModel} from './contentViewModel';
import {ListViewModel} from './listViewModel';

import type {AssetRepository} from '../repositories/assets/assetRepository';
import type {AudioRepository} from '../repositories/audio/audioRepository';
import type {BackupRepository} from '../repositories/backup/backupRepository';
import type {CallingRepository} from '../repositories/calling/callingRepository';
import {CellsRepository} from '../repositories/cells/cellsRepository';
import type {ClientRepository} from '../repositories/client';
import type {ConnectionRepository} from '../repositories/connection/connectionRepository';
import type {ConversationRepository} from '../repositories/conversation/conversationRepository';
import type {MessageRepository} from '../repositories/conversation/messageRepository';
import type {CryptographyRepository} from '../repositories/cryptography/cryptographyRepository';
import type {EventRepository} from '../repositories/event/eventRepository';
import type {GiphyRepository} from '../repositories/extension/giphyRepository';
import type {IntegrationRepository} from '../repositories/integration/integrationRepository';
import type {LifeCycleRepository} from '../repositories/lifeCycleRepository/lifeCycleRepository';
import {MediaDevicesHandler} from '../repositories/media/mediaDevicesHandler';
import {MediaStreamHandler} from '../repositories/media/mediaStreamHandler';
import type {MeetingsRepository} from '../repositories/meetings/meetingsRepository';
import type {NotificationRepository} from '../repositories/notification/notificationRepository';
import type {PreferenceNotificationRepository} from '../repositories/notification/preferenceNotificationRepository';
import type {PropertiesRepository} from '../repositories/properties/propertiesRepository';
import type {SearchRepository} from '../repositories/search/searchRepository';
import type {SelfRepository} from '../repositories/self/selfRepository';
import type {StorageRepository} from '../repositories/storage';
import type {TeamRepository} from '../repositories/team/teamRepository';
import {TeamState} from '../repositories/team/teamState';
import type {EventTrackingRepository} from '../repositories/tracking/eventTrackingRepository';
import type {UserRepository} from '../repositories/user/userRepository';
import {UserState} from '../repositories/user/userState';
import {Core} from '../service/coreSingleton';
import type {ServerTimeHandler} from '../time/serverTimeHandler';
import {type Translate} from '../util/localizerUtil';

type MainViewModelPanelConfig = {BREAKPOINT: number; WIDTH: number};
type MainViewModelConfig = {PANEL: MainViewModelPanelConfig};

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
  meetings: MeetingsRepository;
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
  readonly translate: Translate;

  static get CONFIG(): MainViewModelConfig {
    return {
      PANEL: {
        BREAKPOINT: 1000,
        WIDTH: 304,
      },
    };
  }

  get isFederated(): boolean {
    return this.core.backendFeatures.isFederated;
  }

  constructor(repositories: ViewModelRepositories, translate: Translate, fireAndForgetInvoker: FireAndForgetInvoker) {
    this.translate = translate;
    const userState = container.resolve(UserState);
    const teamState = container.resolve(TeamState);
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
      teamState,
      this,
      this.translate,
    );

    this.calling = new CallingViewModel(
      repositories.calling,
      repositories.audio,
      mediaDevicesHandler,
      mediaStreamHandler,
      repositories.team,
      repositories.properties,
      userState.self,
      this.translate,
    );
    this.content = new ContentViewModel(this, repositories, this.translate);
    this.list = new ListViewModel(this, repositories, this.translate, fireAndForgetInvoker);
  }
}
