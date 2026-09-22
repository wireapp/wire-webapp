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

import {CONVERSATION_TYPE, DefaultConversationRoleName} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL, FEATURE_STATUS} from '@wireapp/api-client/lib/team';
import {Maybe, task} from 'true-myth';
import {asyncNoop, noop} from 'noop-esm';

import {ConversationMapper} from 'Repositories/conversation/ConversationMapper';
import {Conversation} from 'Repositories/entity/Conversation';
import {translateForTest} from 'Util/test/translateForTest';

import {canManuallyMigrateConversation, manuallyMigrateConversation} from './manualMigration';

const feature = {
  status: FEATURE_STATUS.ENABLED,
  config: {allowManualMigration: true, startTime: '2099-01-01T00:00:00Z'},
};
const selfUser = {teamId: 'team', qualifiedId: {id: 'self', domain: 'example.com'}};
const createConversation = (protocol = CONVERSATION_PROTOCOL.PROTEUS) => {
  const conversation = new Conversation('conversation', 'example.com', protocol, translateForTest);
  conversation.type(CONVERSATION_TYPE.REGULAR);
  conversation.teamId = 'team';
  conversation.roles({self: DefaultConversationRoleName.WIRE_ADMIN});
  conversation.groupId = protocol === CONVERSATION_PROTOCOL.PROTEUS ? '' : 'group';
  return conversation;
};
const arrange = (protocol = CONVERSATION_PROTOCOL.PROTEUS) => {
  const conversation = createConversation(protocol);
  const repository = {
    updateConversationProtocol: jest.fn(async (current: Conversation, next: CONVERSATION_PROTOCOL) =>
      ConversationMapper.updateProperties(current, {protocol: next, groupId: 'group'}),
    ),
    tryEstablishingMLSGroup: jest.fn(asyncNoop),
    safeEnsureConversationExists: jest.fn(() => task.resolve().map(noop)),
  };
  const deps = {
    conversation,
    selfUser,
    repository,
    getFeature: () => Maybe.just(feature),
  };
  return {deps, repository};
};

describe('manual MLS migration', () => {
  it.each([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MIXED])(
    'allows a same-team conversation admin on %s before the start date',
    protocol => {
      expect(canManuallyMigrateConversation(createConversation(protocol), selfUser, Maybe.just(feature))).toBe(true);
    },
  );

  it.each([DefaultConversationRoleName.WIRE_MEMBER, ''])(
    'rejects a non-admin role (%s) before making requests',
    async role => {
      const {deps, repository} = arrange();
      deps.conversation.roles({self: role});
      expect(canManuallyMigrateConversation(deps.conversation, selfUser, Maybe.just(feature))).toBe(false);
      const outcome = await manuallyMigrateConversation(deps);
      expect(outcome.isErr && outcome.error.reason).toBe('notAllowed');
      expect(repository.updateConversationProtocol).not.toHaveBeenCalled();
      expect(repository.tryEstablishingMLSGroup).not.toHaveBeenCalled();
    },
  );

  it('does not finalise when the admin role is revoked during establishment', async () => {
    const {deps, repository} = arrange(CONVERSATION_PROTOCOL.MIXED);
    repository.tryEstablishingMLSGroup.mockImplementation(async () => {
      deps.conversation.roles({self: DefaultConversationRoleName.WIRE_MEMBER});
    });
    const outcome = await manuallyMigrateConversation(deps);
    expect(outcome.isErr && outcome.error.reason).toBe('notAllowed');
    expect(repository.updateConversationProtocol).not.toHaveBeenCalled();
  });

  it('excludes other teams and missing team IDs, even when both are missing', () => {
    const conversation = createConversation();
    expect(canManuallyMigrateConversation(conversation, {...selfUser, teamId: 'other'}, Maybe.just(feature))).toBe(
      false,
    );
    expect(canManuallyMigrateConversation(conversation, {qualifiedId: selfUser.qualifiedId}, Maybe.just(feature))).toBe(
      false,
    );
    conversation.teamId = '';
    expect(canManuallyMigrateConversation(conversation, {qualifiedId: selfUser.qualifiedId}, Maybe.just(feature))).toBe(
      false,
    );
  });

  it('requires both backend flags and a group using Proteus or Mixed', () => {
    const conversation = createConversation();
    for (const config of [
      Maybe.nothing<typeof feature>(),
      Maybe.just({...feature, status: FEATURE_STATUS.DISABLED}),
      Maybe.just({...feature, config: {allowManualMigration: false}}),
      Maybe.just({...feature, config: {}}),
    ]) {
      expect(canManuallyMigrateConversation(conversation, selfUser, config)).toBe(false);
    }
    expect(
      canManuallyMigrateConversation(createConversation(CONVERSATION_PROTOCOL.MLS), selfUser, Maybe.just(feature)),
    ).toBe(false);
    conversation.type(CONVERSATION_TYPE.ONE_TO_ONE);
    expect(canManuallyMigrateConversation(conversation, selfUser, Maybe.just(feature))).toBe(false);
  });

  it('establishes the group between Mixed and MLS updates on the shared conversation', async () => {
    const {deps, repository} = arrange();
    const order: string[] = [];
    repository.updateConversationProtocol.mockImplementation(async (current, protocol) => {
      order.push(protocol);
      return ConversationMapper.updateProperties(current, {protocol, groupId: 'group'});
    });
    repository.tryEstablishingMLSGroup.mockImplementation(async () => {
      order.push('establish');
    });
    const outcome = await manuallyMigrateConversation(deps);
    expect(outcome.isOk).toBe(true);
    expect(order).toEqual([CONVERSATION_PROTOCOL.MIXED, 'establish', CONVERSATION_PROTOCOL.MLS]);
    expect(outcome.isOk && outcome.value).toBe(deps.conversation);
    expect(deps.conversation.protocol).toBe(CONVERSATION_PROTOCOL.MLS);
  });

  it('joins an established Mixed group before finalisation', async () => {
    const {deps, repository} = arrange(CONVERSATION_PROTOCOL.MIXED);
    deps.conversation.epoch = 1;
    expect((await manuallyMigrateConversation(deps)).isOk).toBe(true);
    expect(repository.safeEnsureConversationExists).toHaveBeenCalledWith({
      conversationId: deps.conversation.qualifiedId,
      groupId: 'group',
    });
    expect(repository.tryEstablishingMLSGroup).not.toHaveBeenCalled();
    expect(repository.updateConversationProtocol).toHaveBeenCalledTimes(1);
  });

  it('propagates establishment failure without finalising and permits retry', async () => {
    const {deps, repository} = arrange(CONVERSATION_PROTOCOL.MIXED);
    const cause = {code: 409, label: 'migration-rejected'};
    repository.tryEstablishingMLSGroup.mockRejectedValueOnce(cause);
    const outcome = await manuallyMigrateConversation(deps);
    expect(outcome.isErr && outcome.error.stage).toBe('establish');
    expect(outcome.isErr && outcome.error.cause.unwrapOr('missing')).toEqual(cause);
    expect(repository.updateConversationProtocol).not.toHaveBeenCalled();
    expect((await manuallyMigrateConversation(deps)).isOk).toBe(true);
  });

  it('shares pending state across callers and releases it after failure', async () => {
    const {deps, repository} = arrange();
    const deferred = Promise.withResolvers<Conversation>();
    repository.updateConversationProtocol.mockReturnValueOnce(deferred.promise);
    const first = manuallyMigrateConversation(deps);
    const duplicate = await manuallyMigrateConversation({...deps, repository: {...repository}});
    expect(duplicate.isErr && duplicate.error.stage).toBe('busy');
    deferred.reject('offline');
    expect((await first).isErr).toBe(true);
    expect((await manuallyMigrateConversation(deps)).isOk).toBe(true);
  });

  it('reports finalisation failure and refuses false success when the protocol stays Mixed', async () => {
    const {deps, repository} = arrange(CONVERSATION_PROTOCOL.MIXED);
    repository.updateConversationProtocol.mockRejectedValueOnce('offline');
    const failed = await manuallyMigrateConversation(deps);
    expect(failed.isErr && failed.error.stage).toBe('finalise');
    repository.updateConversationProtocol.mockResolvedValueOnce(deps.conversation);
    const unchanged = await manuallyMigrateConversation(deps);
    expect(unchanged.isErr && unchanged.error.stage).toBe('finalise');
    expect(unchanged.isErr && unchanged.error.reason).toBe('protocolUnchanged');
  });

  it('does not finalise when permission is revoked during establishment', async () => {
    const {deps, repository} = arrange(CONVERSATION_PROTOCOL.MIXED);
    let allowed = true;
    repository.tryEstablishingMLSGroup.mockImplementation(async () => {
      allowed = false;
    });
    const outcome = await manuallyMigrateConversation({
      ...deps,
      getFeature: () => (allowed ? Maybe.just(feature) : Maybe.nothing()),
    });
    expect(outcome.isErr && outcome.error.stage).toBe('eligibility');
    expect(outcome.isErr && outcome.error.reason).toBe('notAllowed');
    expect(repository.updateConversationProtocol).not.toHaveBeenCalled();
  });

  it('handles another client completing migration during initialisation', async () => {
    const {deps, repository} = arrange();
    repository.updateConversationProtocol.mockImplementationOnce(async current =>
      ConversationMapper.updateProperties(current, {protocol: CONVERSATION_PROTOCOL.MLS, groupId: 'group'}),
    );
    expect((await manuallyMigrateConversation(deps)).isOk).toBe(true);
    expect(repository.updateConversationProtocol).toHaveBeenCalledTimes(1);
    expect(repository.tryEstablishingMLSGroup).not.toHaveBeenCalled();
  });

  it('rechecks flags before making any request', async () => {
    const {deps, repository} = arrange();
    const outcome = await manuallyMigrateConversation({...deps, getFeature: () => Maybe.nothing()});
    expect(outcome.isErr && outcome.error.stage).toBe('eligibility');
    expect(outcome.isErr && outcome.error.reason).toBe('notAllowed');
    expect(repository.updateConversationProtocol).not.toHaveBeenCalled();
  });
});
