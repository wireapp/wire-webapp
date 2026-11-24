/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {AssetRepository} from '../repositories/assets/assetRepository';
import type {AudioRepository} from '../repositories/audio/audioRepository';
import type {BackupRepository} from '../repositories/backup/backupRepository';
import type {CallingRepository} from '../repositories/calling/CallingRepository';
import type {CellsRepository} from '../repositories/cells/cellsRepository';
import type {ClientRepository} from '../repositories/client';
import type {ConnectionRepository} from '../repositories/connection/connectionRepository';
import type {ConversationRepository} from '../repositories/conversation/ConversationRepository';
import type {MessageRepository} from '../repositories/conversation/MessageRepository';
import type {CryptographyRepository} from '../repositories/cryptography/CryptographyRepository';
import type {EventRepository} from '../repositories/event/EventRepository';
import type {GiphyRepository} from '../repositories/extension/GiphyRepository';
import type {IntegrationRepository} from '../repositories/integration/IntegrationRepository';
import type {LifeCycleRepository} from '../repositories/LifeCycleRepository/LifeCycleRepository';
import type {MeetingsRepository} from '../repositories/meetings/meetingsRepository';
import type {NotificationRepository} from '../repositories/notification/NotificationRepository';
import type {PreferenceNotificationRepository} from '../repositories/notification/PreferenceNotificationRepository';
import type {PropertiesRepository} from '../repositories/properties/propertiesRepository';
import type {SearchRepository} from '../repositories/search/searchRepository';
import type {SelfRepository} from '../repositories/self/SelfRepository';
import type {StorageRepository} from '../repositories/storage';
import type {TeamRepository} from '../repositories/team/TeamRepository';
import type {EventTrackingRepository} from '../repositories/tracking/eventTrackingRepository';
import type {UserRepository} from '../repositories/user/userRepository';
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
