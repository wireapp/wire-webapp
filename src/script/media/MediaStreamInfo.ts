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

import {CallEntity} from '../calling/entities/CallEntity';
import {MediaStreamHandler} from './MediaStreamHandler';
import {MediaStreamSource} from './MediaStreamSource';

export class MediaStreamInfo {
  callEntity: CallEntity;
  conversationId?: string;
  flowId: string;
  source: MediaStreamSource;
  stream: MediaStream;

  constructor(source: MediaStreamSource, flowId: string, stream: MediaStream, callEntity: CallEntity) {
    this.source = source;
    this.flowId = flowId;
    this.stream = stream;
    this.callEntity = callEntity;

    this.conversationId = callEntity ? callEntity.id : undefined;
  }

  getType() {
    return MediaStreamHandler.detectMediaStreamType(this.stream);
  }
}
