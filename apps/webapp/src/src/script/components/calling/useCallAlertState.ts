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

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {create} from 'zustand';

type CallAlertState = {
  showAlert: boolean;
  isGroupCall: boolean;
  showStartedCallAlert: (isGroupCall: boolean, isVideoCall?: boolean) => void;
  clearShowAlert: () => void;
  conversationId?: QualifiedId;
  qualityFeedbackModalShown: boolean;
  setQualityFeedbackModalShown: (isVisible: boolean) => void;
  setConversationId: (conversationId?: QualifiedId) => void;
};

const useCallAlertState = create<CallAlertState>((set, get) => ({
  showAlert: false,
  isGroupCall: false,
  qualityFeedbackModalShown: false,
  setQualityFeedbackModalShown: isVisible =>
    set(state => ({
      ...state,
      qualityFeedbackModalShown: isVisible,
    })),
  setConversationId: conversationId =>
    set(state => ({
      ...state,
      conversationId,
    })),
  showStartedCallAlert: (isGroupCall = false, isVideoCall = false) =>
    set(state => ({
      ...state,
      showAlert: true,
      isGroupCall,
    })),
  clearShowAlert: () =>
    set(state => ({
      ...state,
      showAlert: false,
    })),
}));

export {useCallAlertState};
