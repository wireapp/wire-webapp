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

import {Maybe} from 'true-myth';
import {container} from 'tsyringe';

import {createMeetingPrepPreview} from './createMeetingPrepPreview';
import {MeetingPrepModal} from './meetingPrepModal';
import {useMeetingPrepConversation} from './useMeetingPrepConversation';
import {useMeetingPrepJoin} from './useMeetingPrepJoin';
import {useMeetingPrepModal} from './useMeetingPrepModal';

import {Config} from '../../../Config';
import {troubleshooterFeatureToggleName} from '../../../featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from '../../../page/rootProvider';
import {MediaStreamHandler} from '../../../repositories/media/MediaStreamHandler';
import {UserState} from '../../../repositories/user/userState';
import {navigate} from '../../../router/Router';

const openTroubleshooting = (): void => {
  navigate('/preferences/troubleshooting');
};

export const MeetingPrepModalHost: FunctionComponent = () => {
  const participant = container.resolve(UserState).self();
  const preview = useMemo(() => {
    return createMeetingPrepPreview(container.resolve(MediaStreamHandler));
  }, []);
  const joinMeeting = useMeetingPrepJoin();
  const {isFeatureToggleEnabled} = useApplicationContext();
  const {BRAND_NAME: brandName, URL: configUrls} = Config.getConfig();
  const session = useMeetingPrepModal(state => {
    return state.session;
  });
  // Memoised on the stored session, so the conversation subscriptions do not restart on every render.
  const qualifiedConversationId = useMemo(() => {
    return session.map(({qualifiedConversationId: conversationId}) => {
      return conversationId;
    });
  }, [session]);
  const {isCallInProgress, invitees} = useMeetingPrepConversation(qualifiedConversationId);

  return (
    <MeetingPrepModal
      participant={participant}
      isCallInProgress={isCallInProgress}
      invitees={invitees}
      brandName={brandName}
      supportUrl={configUrls.SUPPORT.CALL_ENCRYPTION}
      openTroubleshooting={
        isFeatureToggleEnabled(troubleshooterFeatureToggleName) ? Maybe.just(openTroubleshooting) : Maybe.nothing()
      }
      requestPreviewStream={preview.requestPreviewStream}
      releasePreviewStream={preview.releasePreviewStream}
      joinMeeting={joinMeeting}
    />
  );
};
