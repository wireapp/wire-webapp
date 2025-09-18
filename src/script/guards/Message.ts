/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {DeleteMessage} from 'Repositories/entity/message/DeleteMessage';
import {MemberMessage} from 'Repositories/entity/message/MemberMessage';

import {SuperType} from '../message/SuperType';

export const isReadableMessage = (message: any): message is ContentMessage =>
  message &&
  'super_type' in message &&
  (message.super_type === SuperType.CONTENT || message.super_type === SuperType.PING);

export const isContentMessage = (message: any): message is ContentMessage =>
  message && 'super_type' in message && message.super_type === SuperType.CONTENT;

export const isDeleteMessage = (message: any): message is DeleteMessage =>
  message && 'super_type' in message && message.super_type === SuperType.DELETE;

export const isMemberMessage = (message: any | undefined | null): message is MemberMessage =>
  message && 'super_type' in message && message.super_type === SuperType.MEMBER;
