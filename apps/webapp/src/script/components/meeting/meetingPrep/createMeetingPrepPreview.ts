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

import {task} from 'true-myth';

import type {MediaStreamHandler} from 'Repositories/media/MediaStreamHandler';

import {meetingPrepPreviewErrors, type RequestMeetingPrepPreview} from './meetingPrepTypes';

export const createMeetingPrepPreview = (
  streamHandler: MediaStreamHandler,
): {
  requestPreviewStream: RequestMeetingPrepPreview;
  releasePreviewStream: (stream: MediaStream) => void;
} => ({
  requestPreviewStream: request =>
    task.tryOrElse(
      () => meetingPrepPreviewErrors.requestFailed,
      () => streamHandler.requestMediaStream(request.audio, request.video, false, false),
    ),
  releasePreviewStream: stream => streamHandler.releaseTracksFromStream(stream),
});
