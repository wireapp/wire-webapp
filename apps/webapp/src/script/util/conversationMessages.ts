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

import {AssetType} from 'Repositories/assets/AssetType';
import {Conversation} from 'Repositories/entity/Conversation';
import {Asset} from 'Repositories/entity/message/Asset';
import type {FileAsset as FileAssetType} from 'Repositories/entity/message/FileAsset';
import type {Message} from 'Repositories/entity/message/Message';

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

export const isLastReceivedMessage = (messageEntity: Message, conversationEntity: Conversation): boolean => {
  return messageEntity.timestamp() >= conversationEntity.last_event_timestamp();
};
