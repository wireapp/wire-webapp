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

import * as hash from 'hash.js';
// @ts-expect-error - long module has compatibility issues between versions
import * as Long from 'long';

import {AssetContent, ContentType, ConversationContent, LocationContent, TextContent} from '../conversation/content';

export type AvailableMessageContent = AssetContent | LocationContent | TextContent;

export class MessageHashService {
  private readonly messageContent: AvailableMessageContent;
  private readonly timestamp: number;

  constructor(messageContent: AvailableMessageContent, timestamp: number = Date.now()) {
    this.messageContent = messageContent;
    const unixTimestamp = new Date(timestamp).getTime();
    this.timestamp = Math.floor(unixTimestamp / 1e3);
  }

  private createSha256Hash(buffer: Buffer): Buffer {
    const hashArray = hash.sha256().update(buffer).digest();
    return Buffer.from(hashArray);
  }

  private convertToUtf16BE(str: string): Buffer {
    const BOMChar = '\uFEFF';

    str = `${BOMChar}${str}`;

    const buffer = Buffer.from(str, 'ucs2');

    for (let index = 0; index < buffer.length; index += 2) {
      const tempValue = buffer[index];
      buffer[index] = buffer[index + 1];
      buffer[index + 1] = tempValue;
    }

    return buffer;
  }

  private getAssetBytes(content: AssetContent): Buffer {
    if (content.uploaded) {
      const assetId = content.uploaded.assetId;
      return this.convertToUtf16BE(assetId);
    }
    return Buffer.from([]);
  }

  private getTimestampBuffer(timestamp: number): Buffer {
    const timestampBytes = Long.fromInt(timestamp).toBytesBE();
    return Buffer.from(timestampBytes);
  }

  private getLocationBytes(content: LocationContent): Buffer {
    const latitudeApproximate = Math.round(content.latitude * 1000);
    const longitudeApproximate = Math.round(content.longitude * 1000);

    const latitudeLong = Long.fromInt(latitudeApproximate).toBytesBE();
    const longitudeLong = Long.fromInt(longitudeApproximate).toBytesBE();

    const latitudeBuffer = Buffer.from(latitudeLong);
    const longitudeBuffer = Buffer.from(longitudeLong);

    return Buffer.concat([latitudeBuffer, longitudeBuffer]);
  }

  private getTextBytes(content: TextContent): Buffer {
    return this.convertToUtf16BE(content.text);
  }

  private getBytes(content: ConversationContent): Buffer {
    let bytes: Buffer;

    if (ContentType.isLocationContent(content)) {
      bytes = this.getLocationBytes(content);
    } else if (ContentType.isTextContent(content)) {
      bytes = this.getTextBytes(content);
    } else if (ContentType.isAssetContent(content)) {
      bytes = this.getAssetBytes(content);
    } else {
      throw new Error(`Unknown message type. ${content}`);
    }

    const timestampBuffer = this.getTimestampBuffer(this.timestamp);
    return Buffer.concat([bytes, timestampBuffer]);
  }

  getHash(): Buffer {
    const buffer = this.getBytes(this.messageContent);
    return this.createSha256Hash(buffer);
  }
}
