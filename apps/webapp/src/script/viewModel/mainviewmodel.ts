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

import type {AssetRepository} from 'Repositories/assets/assetrepository';
import type {AudioRepository} from 'Repositories/audio/audiorepository';
import type {BackupRepository} from 'Repositories/backup/backuprepository';
import type {CallingRepository} from 'Repositories/calling/callingrepository';
import {CellsRepository} from 'Repositories/cells/cellsrepository';
import type {ClientRepository} from 'Repositories/client';
import type {ConnectionRepository} from 'Repositories/connection/connectionrepository';
import type {ConversationRepository} from 'Repositories/conversation/conversationrepository';
import type {MessageRepository} from 'Repositories/conversation/messagerepository';
import type {CryptographyRepository} from 'Repositories/cryptography/cryptographyrepository';
import type {EventRepository} from 'Repositories/event/eventrepository';
import type {GiphyRepository} from 'Repositories/extension/giphyrepository';
import type {IntegrationRepository} from 'Repositories/integration/integrationrepository';
import type {LifeCycleRepository} from 'Repositories/lifecyclerepository/lifecyclerepository';
import {MediaDevicesHandler} from 'Repositories/media/mediadeviceshandler';
import {MediaStreamHandler} from 'Repositories/media/mediastreamhandler';
import type {MeetingsRepository} from 'Repositories/meetings/meetingsrepository';
import type {NotificationRepository} from 'Repositories/notification/notificationrepository';
import type {PreferenceNotificationRepository} from 'Repositories/notification/preferencenotificationrepository';
import type {PropertiesRepository} from 'Repositories/properties/propertiesrepository';
import type {SearchRepository} from 'Repositories/search/searchrepository';
import type {SelfRepository} from 'Repositories/self/selfrepository';
import type {StorageRepository} from 'Repositories/storage';
import type {TeamRepository} from 'Repositories/team/teamrepository';
import {TeamState} from 'Repositories/team/teamstate';
import type {EventTrackingRepository} from 'Repositories/tracking/eventtrackingrepository';
import type {UserRepository} from 'Repositories/user/userrepository';
import {UserState} from 'Repositories/user/userstate';
import {type Translate} from 'Util/localizerUtil';

import {ActionsViewModel} from './actionsviewmodel';
import {CallingViewModel} from './callingviewmodel';
import {ContentViewModel} from './contentviewmodel';
import {ListViewModel} from './listviewmodel';

import {Core} from '../service/coreSingleton';
import type {ServerTimeHandler} from '../time/servertimehandler';

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

  constructor(repositories: ViewModelRepositories, translate: Translate) {
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
    this.list = new ListViewModel(this, repositories, this.translate);
  }
}
