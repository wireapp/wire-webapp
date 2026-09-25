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

import type {QualifiedId} from '@wireapp/api-client/lib/user';

import {joinMeetingCall, type JoinMeetingCallDeps} from 'Components/meeting/joinMeetingCall';
import {handleJoinMeetingCallResult} from 'Components/meeting/useJoinMeetingCall';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {
  showCallNotEstablishedModal,
  type NoInternetCallGuardCopy,
} from 'Hooks/useNoInternetCallGuard/useNoInternetCallGuard';
import type {CallMediaChoice} from 'Repositories/calling/callMediaChoice';
import {Config} from 'src/script/Config';
import type {Translate} from 'Util/localizerUtil';

export type JoinPreparedMeetingParams = {
  deps: JoinMeetingCallDeps;
  qualifiedConversationId: QualifiedId;
  media: CallMediaChoice;
  guardCall: (startCall: () => void) => void;
  translate: Translate;
  callNotEstablishedCopy: NoInternetCallGuardCopy;
};

const showConversationNotFoundModal = (translate: Translate): void => {
  PrimaryModal.show(
    PrimaryModal.type.ACKNOWLEDGE,
    {
      text: {
        message: translate('conversationNotFoundMessage'),
        title: translate('conversationNotFoundTitle', {brandName: Config.getConfig().BRAND_NAME}),
      },
    },
    undefined,
    translate,
  );
};

export const joinPreparedMeeting = async ({
  deps,
  qualifiedConversationId,
  media,
  guardCall,
  translate,
  callNotEstablishedCopy,
}: JoinPreparedMeetingParams): Promise<boolean> => {
  let joinAllowed = false;
  guardCall(() => {
    joinAllowed = true;
  });

  if (!joinAllowed) {
    return false;
  }

  const result = await joinMeetingCall(deps, qualifiedConversationId, media);

  if (result.isErr) {
    handleJoinMeetingCallResult(result, {
      showConversationNotFoundModal: () => showConversationNotFoundModal(translate),
      showJoinFailedModal: () => showCallNotEstablishedModal(callNotEstablishedCopy),
    });
    return false;
  }

  return true;
};
