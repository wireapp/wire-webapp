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

import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL, FEATURE_STATUS, type FeatureList} from '@wireapp/api-client/lib/team';
import ko from 'knockout';
import {task} from 'true-myth';
import {asyncNoop, noop} from 'noop-esm';

import {Conversation} from 'Repositories/entity/Conversation';
import {withTheme} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {ManualMigrationProtocolDetails} from './manualMigrationProtocolDetails';

const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));
const createConversation = (protocol = CONVERSATION_PROTOCOL.PROTEUS) => {
  const conversation = new Conversation('conversation', 'example.com', protocol, translateForTest);
  conversation.type(CONVERSATION_TYPE.REGULAR);
  conversation.teamId = 'team';
  conversation.groupId = protocol === CONVERSATION_PROTOCOL.PROTEUS ? '' : 'group';
  return conversation;
};
const arrange = () => {
  const repository = {
    updateConversationProtocol: jest.fn(async (_conversation: Conversation, protocol: CONVERSATION_PROTOCOL) =>
      createConversation(protocol),
    ),
    tryEstablishingMLSGroup: jest.fn(asyncNoop),
    safeEnsureConversationExists: jest.fn(() => task.resolve().map(noop)),
  };
  const teamState = {
    teamFeatures: ko.observable<FeatureList | undefined>({
      mlsMigration: {
        status: FEATURE_STATUS.ENABLED,
        config: {allowManualMigration: true},
      },
    }),
  };
  const props = {
    repository,
    teamState,
    conversation: createConversation(),
    selfUser: {teamId: 'team', qualifiedId: {id: 'self', domain: 'example.com'}},
  };
  return {props, repository, teamState};
};

const activate = (count = 5) => {
  for (let i = 0; i < count; i += 1) {
    fireEvent.click(screen.getByRole('button', {name: 'modalCreateGroupProtocolHeading PROTEUS'}));
  }
};

describe('manual migration protocol details', () => {
  it('opens only on the fifth activation and cancellation sends no request', () => {
    const {props, repository} = arrange();
    render(withTheme(<ManualMigrationProtocolDetails {...props} />), {wrapper});
    activate(4);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    activate(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'modalConfirmSecondary'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(repository.updateConversationProtocol).not.toHaveBeenCalled();
    activate(4);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('resets the gesture on other clicks and revokes the dialog when the flag changes', () => {
    const {props, teamState} = arrange();
    render(withTheme(<ManualMigrationProtocolDetails {...props} />), {wrapper});
    activate(4);
    fireEvent.click(document.body);
    activate(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    activate(4);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    act(() => {
      teamState.teamFeatures({mlsMigration: {status: FEATURE_STATUS.ENABLED, config: {allowManualMigration: false}}});
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'modalCreateGroupProtocolHeading PROTEUS'})).not.toBeInTheDocument();
  });

  it('blocks repeat submission, Escape, and backdrop dismissal while pending, then refreshes the protocol', async () => {
    const {props, repository} = arrange();
    const deferred = Promise.withResolvers<Conversation>();
    repository.updateConversationProtocol.mockReturnValueOnce(deferred.promise);
    render(withTheme(<ManualMigrationProtocolDetails {...props} />), {wrapper});
    activate();
    const confirm = screen.getByRole('button', {name: 'manualMlsMigrationConfirm'});
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(confirm).toBeDisabled();
    expect(screen.getByRole('button', {name: 'modalConfirmSecondary'})).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('heading', {name: 'manualMlsMigrationTitle'}), {key: 'Escape'});
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(repository.updateConversationProtocol).toHaveBeenCalledTimes(1);
    await act(async () => {
      deferred.resolve(createConversation(CONVERSATION_PROTOCOL.MIXED));
    });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('manualMlsMigrationSuccess'));
    expect(screen.getByText('MLS')).toBeInTheDocument();
    const resultDialog = screen.getByRole('dialog');
    expect(within(resultDialog).getByRole('status')).toHaveTextContent('manualMlsMigrationSuccess');
    expect(within(resultDialog).getAllByRole('button')).toHaveLength(1);
    const ok = within(resultDialog).getByRole('button', {name: 'modalAcknowledgeAction'});
    expect(ok).toHaveFocus();
    fireEvent.click(ok);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps a remounted panel blocked until the existing migration finishes', async () => {
    const {props, repository} = arrange();
    const deferred = Promise.withResolvers<Conversation>();
    repository.updateConversationProtocol.mockReturnValueOnce(deferred.promise);
    const panel = render(withTheme(<ManualMigrationProtocolDetails {...props} />), {wrapper});
    activate();
    fireEvent.click(screen.getByRole('button', {name: 'manualMlsMigrationConfirm'}));
    panel.unmount();

    render(withTheme(<ManualMigrationProtocolDetails {...props} />), {wrapper});
    activate();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(repository.updateConversationProtocol).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.reject('offline');
    });
    activate();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the translated reason when finalisation does not change the protocol', async () => {
    const {props, repository} = arrange();
    repository.updateConversationProtocol.mockResolvedValue(createConversation(CONVERSATION_PROTOCOL.MIXED));
    render(withTheme(<ManualMigrationProtocolDetails {...props} />), {wrapper});
    activate();
    fireEvent.click(screen.getByRole('button', {name: 'manualMlsMigrationConfirm'}));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('manualMlsMigrationProtocolUnchanged'));
    expect(within(screen.getByRole('dialog')).getAllByRole('button')).toHaveLength(1);
  });

  it('shows failure in the modal until acknowledged and allows a fresh confirmation', async () => {
    const {props, repository} = arrange();
    repository.updateConversationProtocol.mockRejectedValueOnce({code: 409, label: 'migration-rejected'});
    render(withTheme(<ManualMigrationProtocolDetails {...props} />), {wrapper});
    activate();
    fireEvent.click(screen.getByRole('button', {name: 'manualMlsMigrationConfirm'}));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('manualMlsMigrationFailure'));
    expect(screen.getByText('PROTEUS')).toBeInTheDocument();
    const resultDialog = screen.getByRole('dialog');
    expect(within(resultDialog).getAllByRole('button')).toHaveLength(1);
    fireEvent.click(within(resultDialog).getByRole('button', {name: 'modalAcknowledgeAction'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(repository.updateConversationProtocol).toHaveBeenCalledTimes(1);
    activate();
    expect(screen.getByRole('status')).toHaveTextContent('manualMlsMigrationDescription');
    expect(within(screen.getByRole('dialog')).getAllByRole('button')).toHaveLength(2);
  });
});
