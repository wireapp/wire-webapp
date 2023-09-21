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

import {Asset} from 'src/script/entity/message/Asset';
import type {FileAsset as FileAssetType} from 'src/script/entity/message/FileAsset';
import {isSameDay, differenceInMinutes} from 'Util/TimeUtil';

import {AssetType} from '../assets/AssetType';
import {Message} from '../entity/message/Message';

export enum MessageMarkerType {
  /** The message should be displayed standalone and should not create any section */
  NONE,
  /** The message should create a new 'unread' section when rendered */
  UNREAD,
  /** The message should create a new 'day' section when rendered */
  DAY,
  /** The message should create a new 'hour' section when rendered */
  HOUR,
}

/**
 * Return a marker that should be displayed right before the given message.
 * A marker would indicated a new day, hour or unread section
 *
 * @param message The message we want to render
 * @param lastReadTimestamp If given will check new messages from this timestamp instead of live value of conversation.last_read_timestamp()
 * @param previousMessage The right before in the conversation
 */
export function getMessageMarkerType(
  message: Message,
  lastReadTimestamp: number,
  previousMessage?: Message,
): MessageMarkerType {
  if (!previousMessage || message.isCall()) {
    return MessageMarkerType.NONE;
  }

  const isFirstUnread = previousMessage.timestamp() <= lastReadTimestamp && message.timestamp() > lastReadTimestamp;

  if (isFirstUnread) {
    return MessageMarkerType.UNREAD;
  }

  const last = previousMessage.timestamp();
  const current = message.timestamp();

  if (!isSameDay(last, current)) {
    return MessageMarkerType.DAY;
  }

  if (differenceInMinutes(current, last) > 60) {
    return MessageMarkerType.HOUR;
  }

  return MessageMarkerType.NONE;
}

interface MessageDataType {
  senderName: string;
  displayTimestampShort: string;
  assets: Asset[];
}
/**
 * Return a string that should be announced for screen reader users.
 * Screen reader aria-label would help user understand the message based on type
 *
 * @param senderName The message sender name
 * @param message The message we want to render
 * @param assets The message meta data
 */
export function getMessageAriaLabel({senderName, displayTimestampShort, assets}: MessageDataType): string[] {
  return assets.map((asset: Asset) => {
    switch (asset.type) {
      case AssetType.FILE:
        if ((asset as FileAssetType).isFile()) {
          return `${senderName}. At ${displayTimestampShort}. with file attachment, ${asset.file_name} `;
        }
        if ((asset as FileAssetType).isAudio()) {
          return `${senderName}. At ${displayTimestampShort}. with audio, ${asset.file_name} `;
        }
        if ((asset as FileAssetType).isVideo()) {
          return `${senderName}. At ${displayTimestampShort}. with video, ${asset.file_name} `;
        }
      case AssetType.IMAGE:
        return `${senderName}. At ${displayTimestampShort}. with image, ${asset.file_name} `;
      default:
        return `${senderName}. ${asset.text} At ${displayTimestampShort}.`;
    }
  });
}
