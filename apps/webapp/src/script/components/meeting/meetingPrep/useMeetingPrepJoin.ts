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

import {useCallback, useMemo} from 'react';

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {container} from 'tsyringe';

import {joinPreparedMeeting} from 'Components/meeting/meetingPrep/joinPreparedMeeting';
import {useNoInternetCallGuard} from 'Hooks/useNoInternetCallGuard/useNoInternetCallGuard';
import type {CallMediaChoice} from 'Repositories/calling/callMediaChoice';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {useApplicationContext, useMainViewModel} from 'src/script/page/rootProvider';

export const useMeetingPrepJoin = () => {
  const {translate} = useApplicationContext();
  const {content, calling: callingViewModel} = useMainViewModel();
  const {conversation: conversationRepository, calling: callingRepository} = content.repositories;

  const callNotEstablishedCopy = useMemo(
    () => ({
      description: translate('callNotEstablishedDescription'),
      descriptionPoints: [
        translate('callNotEstablishedDescriptionPoint1'),
        translate('callNotEstablishedDescriptionPoint2'),
        translate('callNotEstablishedDescriptionPoint3'),
      ] as [string, string, string],
      title: translate('callNotEstablishedTitle'),
      translate,
    }),
    [translate],
  );

  const guardCall = useNoInternetCallGuard(callNotEstablishedCopy);

  const deps = useMemo(
    () => ({
      conversationState: container.resolve(ConversationState),
      conversationRepository,
      callingRepository,
      callingViewModel,
    }),
    [callingRepository, callingViewModel, conversationRepository],
  );

  return useCallback(
    (qualifiedConversationId: QualifiedId, media: CallMediaChoice) =>
      joinPreparedMeeting({
        deps,
        qualifiedConversationId,
        media,
        guardCall,
        translate,
        callNotEstablishedCopy,
      }),
    [callNotEstablishedCopy, deps, guardCall, translate],
  );
};
