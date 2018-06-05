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

'use strict';

window.z = window.z || {};
window.z.media = z.media || {};

z.media.MediaStreamInfo = class MediaStreamInfo {
  constructor(source, flow_id, stream, call_et) {
    this.source = source;
    this.flow_id = flow_id;
    this.stream = stream;
    this.call_et = call_et;
    this.type = z.media.MediaType.NONE;

    this.conversation_id = call_et ? call_et.id : undefined;
    this.updateStreamType();
    return this;
  }

  updateStreamType() {
    this.stream = z.media.MediaStreamHandler.detectMediaStreamType(this.stream);
    return (this.type = this.stream.type);
  }
};
