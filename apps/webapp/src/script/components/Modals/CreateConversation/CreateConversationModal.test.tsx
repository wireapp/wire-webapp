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
 */

import {act, fireEvent, render} from '@testing-library/react';
import {isNull} from '@sindresorhus/is';
import ko from 'knockout';
import {container as serviceContainer, type InjectionToken} from 'tsyringe';

import {CreateConversationModal} from './CreateConversaionModal';
import {withIsolatedCreateConversationTest} from './hooks/createConversationTestSupport';
import {useCreateConversationModal} from './hooks/useCreateConversationModal';
import {ConversationCreationStep} from './types';

import {ConversationState} from '../../../repositories/conversation/ConversationState';
import {ConversationRepository} from '../../../repositories/conversation/ConversationRepository';
import {Conversation} from '../../../repositories/entity/Conversation';
import {User} from '../../../repositories/entity/User';
import {TeamState} from '../../../repositories/team/TeamState';
import {UserState} from '../../../repositories/user/userState';
import {withThemeAndRootContext} from '../../../auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../page/testSupport/rootContextTestSupport';
import {translateForTest} from '../../../util/test/translateForTest';
import type {MainViewModel} from '../../../view_model/MainViewModel';

type RenderCreateConversationModalOptions = {
  readonly createGroupConversation: ConversationRepository['createGroupConversation'];
  readonly conversationCreationStep: ConversationCreationStep;
};

function stubCreateConversationModalDependencies(): jest.SpyInstance {
  const selfUser = new User('self-user-id', 'example.com', translateForTest);
  const userState = {
    connectedUsers: ko.pureComputed(() => {
      return [];
    }),
    self: ko.observable(selfUser),
  };
  const teamState = {
    isAppsEnabled: ko.pureComputed(() => {
      return false;
    }),
    isCellsEnabled: ko.pureComputed(() => {
      return false;
    }),
    isConferenceCallingEnabled: ko.pureComputed(() => {
      return false;
    }),
    isInTeam: () => {
      return false;
    },
    isMLSEnabled: ko.pureComputed(() => {
      return false;
    }),
    isProtocolToggleEnabledForUser: ko.pureComputed(() => {
      return false;
    }),
    isTeam: ko.pureComputed(() => {
      return false;
    }),
    teamFeatures: ko.observable(undefined),
  };
  const conversationState = {
    hasConversationWith: () => {
      return false;
    },
  };
  const originalContainerResolve: (token: InjectionToken<unknown>, ...resolutionContext: unknown[]) => unknown =
    serviceContainer.resolve.bind(serviceContainer);

  return jest.spyOn(serviceContainer, 'resolve').mockImplementation((token, ...resolutionContext: unknown[]) => {
    if (token === TeamState) {
      return teamState as unknown as TeamState;
    }

    if (token === UserState) {
      return userState as unknown as UserState;
    }

    if (token === ConversationState) {
      return conversationState as unknown as ConversationState;
    }

    return originalContainerResolve(token, ...resolutionContext);
  });
}

function withIsolatedCreateConversationModalTest(testFunction: () => void | Promise<void>): () => Promise<void> {
  return async function runIsolatedCreateConversationModalTest(): Promise<void> {
    const containerResolutionSpy = stubCreateConversationModalDependencies();

    try {
      await withIsolatedCreateConversationTest(testFunction)();
    } finally {
      containerResolutionSpy.mockRestore();
    }
  };
}

function renderCreateConversationModal(options: RenderCreateConversationModalOptions): ReturnType<typeof render> {
  const {createGroupConversation, conversationCreationStep} = options;
  const mainViewModel = {
    content: {
      repositories: {
        conversation: {createGroupConversation},
        search: {
          normalizeQuery: (query: string) => {
            return {query};
          },
          searchByName: async () => {
            return [];
          },
          searchUserInSet: (_query: string, users: User[]) => {
            return users;
          },
        },
        team: {
          filterExternals: async (users: User[]) => {
            return users;
          },
          filterRemoteDomainUsers: async (users: User[]) => {
            return users;
          },
          isSelfConnectedTo: () => {
            return false;
          },
        },
      },
    },
  } as unknown as MainViewModel;

  const modal = useCreateConversationModal.getState();
  modal.showModal();
  modal.setConversationName('Test group');
  modal.setConversationCreationStep(conversationCreationStep);

  const rootContext = createRootContextValueForTest({mainViewModel, translate: translateForTest});
  const wrapper = createRootProviderWrapperForTest(rootContext);

  return render(withThemeAndRootContext(<CreateConversationModal />, wrapper));
}

describe('CreateConversationModal submission lifecycle', () => {
  it(
    'keeps the Done button loading, rejects rapid duplicate submissions, and closes after success',
    withIsolatedCreateConversationModalTest(async () => {
      const createdConversation = {
        qualifiedId: {id: 'conversation-id', domain: 'example.com'},
      } as unknown as Conversation;
      const pendingCreation = Promise.withResolvers<typeof createdConversation>();
      const createGroupConversation = jest.fn(() => {
        return pendingCreation.promise;
      });
      const {getByRole} = renderCreateConversationModal({
        createGroupConversation,
        conversationCreationStep: ConversationCreationStep.ParticipantsSelection,
      });
      const doneButton = getByRole('button', {name: 'createConversationModalHeaderDone'});
      const searchInput = getByRole('textbox');

      expect(doneButton).toHaveAttribute('aria-busy', 'false');

      act(() => {
        fireEvent.click(doneButton);
        fireEvent.click(doneButton);
        fireEvent.keyDown(searchInput, {key: 'Enter'});
        fireEvent.keyDown(searchInput, {key: 'Enter'});
      });

      expect(useCreateConversationModal.getState().isSubmitting).toBe(true);
      expect(doneButton).toBeDisabled();
      expect(doneButton).toHaveAttribute('aria-busy', 'true');
      expect(getByRole('button', {name: 'createConversationModalHeaderDone'})).toBe(doneButton);
      expect(createGroupConversation).toHaveBeenCalledTimes(1);

      await act(async () => {
        pendingCreation.resolve(createdConversation);
        await pendingCreation.promise;
      });

      expect(useCreateConversationModal.getState().isOpen).toBe(false);
      expect(useCreateConversationModal.getState().isSubmitting).toBe(false);
    }),
  );

  it(
    'blocks close, Escape, backdrop dismissal, and backwards navigation before React rerenders',
    withIsolatedCreateConversationModalTest(() => {
      const createGroupConversation = jest.fn(async () => {
        return {qualifiedId: {id: 'conversation-id', domain: 'example.com'}} as unknown as Conversation;
      });
      const {baseElement, getByRole} = renderCreateConversationModal({
        createGroupConversation,
        conversationCreationStep: ConversationCreationStep.ParticipantsSelection,
      });
      const closeButton = getByRole('button', {name: 'accessibility.groupCreationActionCloseModal'});
      const backButton = getByRole('button', {name: 'Back'});
      const searchInput = getByRole('textbox');
      const modalBackdrop = baseElement.querySelector<HTMLElement>('#create-conversation-modal');

      if (isNull(modalBackdrop)) {
        throw new Error('Expected the conversation modal backdrop to be rendered');
      }

      act(() => {
        useCreateConversationModal.getState().setIsSubmitting(true);
        fireEvent.click(closeButton);
        fireEvent.click(backButton);
        fireEvent.keyDown(searchInput, {key: 'Escape'});
        fireEvent.click(modalBackdrop);
      });

      expect(useCreateConversationModal.getState().isOpen).toBe(true);
      expect(useCreateConversationModal.getState().isConfirmDiscardModalOpen).toBe(false);
      expect(useCreateConversationModal.getState().conversationCreationStep).toBe(
        ConversationCreationStep.ParticipantsSelection,
      );
      expect(closeButton).toBeDisabled();
      expect(backButton).toBeDisabled();
      expect(createGroupConversation).not.toHaveBeenCalled();

      act(() => {
        useCreateConversationModal.getState().setIsCreateTeamModalOpen(true);
      });

      const createTeamButton = getByRole('button', {name: 'createConversationTeamCreationModalButton'});
      expect(createTeamButton).toBeDisabled();
      fireEvent.click(createTeamButton);
      expect(useCreateConversationModal.getState().isOpen).toBe(true);
    }),
  );

  it(
    'keeps discard confirmation actions and Escape from changing the modal during submission',
    withIsolatedCreateConversationModalTest(() => {
      const createGroupConversation = jest.fn(async () => {
        return {qualifiedId: {id: 'conversation-id', domain: 'example.com'}} as unknown as Conversation;
      });
      const {getByRole} = renderCreateConversationModal({
        createGroupConversation,
        conversationCreationStep: ConversationCreationStep.ParticipantsSelection,
      });
      fireEvent.click(getByRole('button', {name: 'accessibility.groupCreationActionCloseModal'}));

      const firstCancelDiscardButton = getByRole('button', {name: 'createConversationConfirmDiscardModalCancel'});
      fireEvent.click(firstCancelDiscardButton);
      expect(useCreateConversationModal.getState().isConfirmDiscardModalOpen).toBe(false);

      fireEvent.click(getByRole('button', {name: 'accessibility.groupCreationActionCloseModal'}));
      const cancelDiscardButton = getByRole('button', {name: 'createConversationConfirmDiscardModalCancel'});
      const continueDiscardButton = getByRole('button', {name: 'createConversationConfirmDiscardModalContinue'});

      act(() => {
        useCreateConversationModal.getState().setIsSubmitting(true);
        fireEvent.click(cancelDiscardButton);
        fireEvent.click(continueDiscardButton);
        fireEvent.keyDown(continueDiscardButton, {key: 'Escape'});
      });

      expect(useCreateConversationModal.getState().isOpen).toBe(true);
      expect(useCreateConversationModal.getState().isConfirmDiscardModalOpen).toBe(true);
      expect(useCreateConversationModal.getState().conversationCreationStep).toBe(
        ConversationCreationStep.ParticipantsSelection,
      );
      expect(cancelDiscardButton).toBeDisabled();
      expect(continueDiscardButton).toBeDisabled();
      expect(createGroupConversation).not.toHaveBeenCalled();
    }),
  );
});
