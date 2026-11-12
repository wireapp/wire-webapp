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

import {type FunctionComponent, useMemo} from 'react';

import {container} from 'tsyringe';

import {createMeetingPrepPreview} from './createMeetingPrepPreview';
import {MeetingPrepModal} from './meetingPrepModal';
import {useMeetingPrepJoin} from './useMeetingPrepJoin';

import {MediaStreamHandler} from '../../../repositories/media/MediaStreamHandler';
import {UserState} from '../../../repositories/user/userState';

export const MeetingPrepModalHost: FunctionComponent = () => {
  const participant = container.resolve(UserState).self();
  const preview = useMemo(() => {
    return createMeetingPrepPreview(container.resolve(MediaStreamHandler));
  }, []);
  const joinMeeting = useMeetingPrepJoin();

  return (
    <MeetingPrepModal
      participant={participant}
      requestPreviewStream={preview.requestPreviewStream}
      releasePreviewStream={preview.releasePreviewStream}
      joinMeeting={joinMeeting}
    />
  );
};
