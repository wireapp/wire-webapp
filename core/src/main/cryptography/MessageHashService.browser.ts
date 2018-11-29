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

import * as sodium from 'libsodium-wrappers-sumo';
import * as Long from 'long';

import {AssetContent, ContentType, ConversationContent, LocationContent, TextContent} from '../conversation/content';

type AvailableMessageContent = AssetContent | LocationContent | TextContent;

class MessageHashService {
  private readonly messageContent: AvailableMessageContent;
  private readonly timestamp: number;

  constructor(messageContent: AvailableMessageContent, timestamp?: number) {
    this.messageContent = messageContent;
    this.timestamp = timestamp || Math.round(new Date().getTime() / 1000);
  }

  private createSha256Hash(bytes: number[]): ArrayBuffer {
    const byteArray = new Uint8Array(bytes);
    return sodium.crypto_hash_sha256(byteArray).buffer;
  }

  private convertToUtf16BE(str: string): number[] {
    const BOMChar = '\uFEFF';

    str = `${BOMChar}${str}`;

    const bytes = [];

    for (let i = 0; i < str.length; ++i) {
      const charCode = str.charCodeAt(i);
      bytes.push((charCode & 0xff00) >> 8);
      bytes.push(charCode & 0xff);
    }

    return bytes;
  }

  private getAssetBytes(content: AssetContent): number[] {
    if (content.uploaded) {
      const assetId = content.uploaded.assetId;
      return this.convertToUtf16BE(assetId);
    } else {
      return [];
    }
  }

  private getTimestampBytes(timestamp: number | Date): number[] {
    return Long.fromInt(new Date(timestamp).getTime()).toBytesBE();
  }

  private getLocationBytes(content: LocationContent): number[] {
    const latitudeApproximate = Math.round(content.latitude * 1000);
    const longitudeApproximate = Math.round(content.longitude * 1000);

    const latitudeLong = Long.fromInt(latitudeApproximate).toBytesBE();
    const longitudeLong = Long.fromInt(longitudeApproximate).toBytesBE();

    return latitudeLong.concat(longitudeLong);
  }

  private getTextBytes(content: TextContent): number[] {
    return this.convertToUtf16BE(content.text);
  }

  private getBytes(content: ConversationContent): number[] {
    let bytes: number[];

    if (ContentType.isLocationContent(content)) {
      bytes = this.getLocationBytes(content);
    } else if (ContentType.isTextContent(content)) {
      bytes = this.getTextBytes(content);
    } else if (ContentType.isAssetContent(content)) {
      bytes = this.getAssetBytes(content);
    } else {
      throw new Error(`Unknown message type. ${content}`);
    }

    const timestampBytes = this.getTimestampBytes(this.timestamp);
    return bytes.concat(timestampBytes);
  }

  getHash(): Buffer {
    const bytes = this.getBytes(this.messageContent);
    return Buffer.from(this.createSha256Hash(bytes));
  }
}

export {MessageHashService};
