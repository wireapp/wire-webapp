/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import {act, render, screen} from '@testing-library/react';

import userEvent from '@testing-library/user-event';
import ko from 'knockout';
import {container} from 'tsyringe';

import {CONVERSATION_PROTOCOL} from '../../apiClient/team/feature/featureList.types';
import type {QualifiedId} from '../../apiClient/user/qualifiedId';
import {withTheme, withThemeAndRootContext} from '../../auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../page/testSupport/rootContextTestSupport';
import {translateForTest} from '../../util/test/translateForTest';
import {ConversationState} from '../../repositories/conversation/ConversationState';
import {Conversation} from '../../repositories/entity/Conversation';

import {sendCallLogsFeatureToggleName} from '../../featureToggles/startupFeatureToggleNames';

import {ConfigToolbar} from './configToolbar';
import {openDebugToolbar} from './debugToolbarEvents';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

describe('ConfigToolbar', () => {
  it('can resume dropping MLS events after navigating away from the targeted conversation', async () => {
    const originalWire = window.wire;
    const conversationState = container.resolve(ConversationState);
    const previousConversation = conversationState.activeConversation();
    const conversation = new Conversation('mls-id', 'example.com', CONVERSATION_PROTOCOL.MLS, translateForTest);
    conversation.groupId = 'mls-group';
    const ignoredMLSConversation = ko.observable<QualifiedId>();
    const setIgnoreIncomingMLS = jest.fn((enabled: boolean) => {
      ignoredMLSConversation(enabled ? conversation.qualifiedId : undefined);
    });
    window.wire = {
      ...originalWire,
      app: {
        debug: {
          ignoredMLSConversation,
          setIgnoreIncomingMLS,
          canIgnoreIncomingMLS: () => {
            return conversationState.activeConversation() === conversation;
          },
          isGzippingEnabled: () => {
            return false;
          },
          isEnabledAvsDebugger: () => {
            return false;
          },
          isEnabledAvsStagingSFT: () => {
            return false;
          },
          isPerformancePanelEnabled: () => {
            return false;
          },
        },
      },
    } as unknown as typeof window.wire;

    try {
      conversationState.activeConversation(undefined);
      render(withTheme(<ConfigToolbar />), {wrapper: rootProviderWrapper});
      act(() => {
        openDebugToolbar();
      });
      expect(screen.getByRole('button', {name: 'Drop Incoming MLS Events'})).toBeDisabled();
      act(() => {
        conversationState.activeConversation(conversation);
      });
      await userEvent.click(screen.getByRole('button', {name: 'Drop Incoming MLS Events'}));
      expect(setIgnoreIncomingMLS).toHaveBeenLastCalledWith(true);
      expect(screen.getByRole('status')).toHaveTextContent('mls-id@example.com');

      act(() => {
        conversationState.activeConversation(undefined);
      });
      await userEvent.click(screen.getByRole('button', {name: 'Resume Incoming MLS Events'}));
      expect(setIgnoreIncomingMLS).toHaveBeenLastCalledWith(false);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByRole('button', {name: 'Drop Incoming MLS Events'})).toBeDisabled();
    } finally {
      window.wire = originalWire;
      act(() => {
        conversationState.activeConversation(previousConversation);
      });
    }
  });

  it('opens the developer menu when requested', () => {
    render(withTheme(<ConfigToolbar />), {wrapper: rootProviderWrapper});

    expect(screen.queryByRole('heading', {name: 'Developer Menu'})).not.toBeInTheDocument();

    act(() => {
      return openDebugToolbar();
    });

    expect(screen.getByRole('heading', {name: 'Developer Menu'})).toBeInTheDocument();
  });

  it.each([false, true])('toggles sending call logs from enabled=%s', async enabled => {
    const navigateTo = jest.fn();
    const rootContextValue = createRootContextValueForTest({
      translate: translateForTest,
      isFeatureToggleEnabled: () => {
        return enabled;
      },
    });
    const wrapper = createRootProviderWrapperForTest({
      ...rootContextValue,
      applicationNavigation: {
        currentPathname: '/app',
        currentSearch: enabled ? '?enabled-features=send-call-logs' : '',
        currentHash: '#preferences',
        navigateTo,
      },
    });
    render(withThemeAndRootContext(<ConfigToolbar />, wrapper));
    act(() => {
      openDebugToolbar();
    });
    await userEvent.click(screen.getByRole('checkbox', {name: sendCallLogsFeatureToggleName}));
    expect(navigateTo).toHaveBeenCalledWith(
      enabled ? '/app?enabled-features=#preferences' : '/app?enabled-features=send-call-logs#preferences',
    );
  });
});
