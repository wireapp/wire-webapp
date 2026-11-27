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

import {isNull} from '@sindresorhus/is';
import {cleanup} from '@testing-library/react';

import {useCreateConversationModal} from './useCreateConversationModal';

import {useSidebarStore} from '../../../../page/leftSidebar/panels/conversations/useSidebarStore';
import {useAppMainState} from '../../../../page/state';
import {usePrimaryModalState} from '../../primaryModal';

type CreateConversationTest = () => void | Promise<void>;
export function withIsolatedCreateConversationTest(testFunction: CreateConversationTest): () => Promise<void> {
  return async function runIsolatedCreateConversationTest(): Promise<void> {
    const previousConversationModalState = useCreateConversationModal.getState();
    const previousPrimaryModalState = usePrimaryModalState.getState();
    const previousSidebarTab = useSidebarStore.getState().currentTab;
    const previousResponsiveView = useAppMainState.getState().responsiveView.currentView;
    const originalSidebarStorage = localStorage.getItem('sidebar-store');
    const originalWindowLocationHash = window.location.hash;

    useCreateConversationModal.setState(useCreateConversationModal.getInitialState(), true);
    usePrimaryModalState.setState(usePrimaryModalState.getInitialState(), true);

    try {
      await testFunction();
    } finally {
      cleanup();
      useCreateConversationModal.setState(previousConversationModalState, true);
      usePrimaryModalState.setState(previousPrimaryModalState, true);

      if (useSidebarStore.getState().currentTab !== previousSidebarTab) {
        useSidebarStore.getState().setCurrentTab(previousSidebarTab);
      }

      if (useAppMainState.getState().responsiveView.currentView !== previousResponsiveView) {
        useAppMainState.getState().responsiveView.setCurrentView(previousResponsiveView);
      }
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${window.location.search}${originalWindowLocationHash}`,
      );

      if (isNull(originalSidebarStorage)) {
        localStorage.removeItem('sidebar-store');
      } else {
        localStorage.setItem('sidebar-store', originalSidebarStorage);
      }
    }
  };
}
