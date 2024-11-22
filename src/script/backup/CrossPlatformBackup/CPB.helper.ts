/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {ClientEvent} from 'src/script/event/Client';
import {getLogger} from 'Util/Logger';

import {MPBackup} from './CPB.library';

import {FileData} from '../Backup.types';

export const CPBLogger = getLogger('wire:backup:CPB');

export const isMPBackup = (data: FileData): boolean => !!data[MPBackup.ZIP_ENTRY_DATA];

export const isMessageAddEvent = (eventType: unknown): boolean =>
  eventType === ClientEvent.CONVERSATION.MESSAGE_ADD.toString();

export const isAssetAddEvent = (eventType: unknown): boolean =>
  eventType === ClientEvent.CONVERSATION.ASSET_ADD.toString();

export const isSupportedEventType = (eventType: string): boolean =>
  isMessageAddEvent(eventType) || isAssetAddEvent(eventType);
