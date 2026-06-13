/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {result, task} from 'true-myth';

import {randomUUID} from 'crypto';

import {Account, MLSService} from '@wireapp/core';

import {ConversationService} from 'Repositories/conversation/ConversationService';
import {MLSConversation} from 'Repositories/conversation/ConversationSelectors';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {ConversationStatus} from 'Repositories/conversation/ConversationStatus';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {UserState} from 'Repositories/user/userState';
import {Core} from 'src/script/service/coreSingleton';
import {TestFactory} from 'test/helper/TestFactory';
import {createConversationForTest} from 'Util/test/createConversationForTest';
import {translateForTest} from 'Util/test/translateForTest';

import {
  classifyLocal,
  classifyRemote,
  ensureMLSGroupIsEstablished,
  fetchRemoteEpoch,
  initMLSGroupConversations,
  initialiseSelfAndTeamConversations,
  readLocalMLSState,
} from './MLSConversations';

function createMLSConversation(type?: CONVERSATION_TYPE, epoch = 0): MLSConversation {
  const conversation = createConversationForTest(randomUUID(), '', CONVERSATION_PROTOCOL.MLS, translateForTest);
  conversation.groupId = `groupid-${randomUUID()}`;
  conversation.epoch = epoch;
  if (type !== undefined) {
    conversation.type(type);
  }
  return conversation as MLSConversation;
}

function createMLSConversations(nbConversations: number, type?: CONVERSATION_TYPE) {
  return Array.from(new Array(nbConversations)).map(() => createMLSConversation(type));
}

function mockSafeEpoch(core: {service?: Core['service']}) {
  (core.service?.mls as unknown as {getSafeEpoch: jest.Mock}).getSafeEpoch = jest
    .fn()
    .mockResolvedValue(task.resolve(1));
}

describe('MLSConversations', () => {
  const testFactory = new TestFactory();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initMLSGroupConversations', () => {
    it('joins all the unestablished MLS groups (epoch > 0)', async () => {
      const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);
      const mlsConversations = createMLSConversations(nbMLSConversations, CONVERSATION_TYPE.REGULAR);
      // Force epoch > 0 to trigger join path instead of establish
      mlsConversations.forEach(c => (c.epoch = 1));

      const conversationRepository = await testFactory.exposeConversationActors();
      const repositoryCore = (conversationRepository as any).core as Core;
      jest.spyOn(repositoryCore.service!.conversation, 'mlsGroupExistsLocally').mockResolvedValue(false);
      jest
        .spyOn(
          (conversationRepository as unknown as {conversationService: {getSafeConversationById: jest.Mock}})
            .conversationService,
          'getSafeConversationById',
        )
        .mockReturnValue(task.fromResult(result.ok({epoch: 1})));
      mockSafeEpoch(repositoryCore);
      const joinSpy = jest.spyOn(repositoryCore.service!.conversation, 'joinByExternalCommit');

      await initMLSGroupConversations(mlsConversations, conversationRepository, {core: repositoryCore});

      for (const conversation of mlsConversations) {
        expect(joinSpy).toHaveBeenCalledWith(conversation.qualifiedId);
      }
    });

    it('does not join MLS groups for past member conversations', async () => {
      const mlsConversation = createMLSConversation(CONVERSATION_TYPE.REGULAR, 1);
      mlsConversation.status(ConversationStatus.PAST_MEMBER);

      const conversationRepository = await testFactory.exposeConversationActors();
      const repositoryCore = (conversationRepository as any).core as Core;

      jest.spyOn(repositoryCore.service!.conversation, 'mlsGroupExistsLocally').mockResolvedValue(false);
      mockSafeEpoch(repositoryCore);
      const joinSpy = jest.spyOn(repositoryCore.service!.conversation, 'joinByExternalCommit');

      await initMLSGroupConversations([mlsConversation], conversationRepository, {core: repositoryCore});

      expect(joinSpy).not.toHaveBeenCalled();
    });
  });

  it('schedules key renewal intervals for all already established mls groups', async () => {
    const core = new Account();
    const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);

    const mlsConversations = createMLSConversations(nbMLSConversations, CONVERSATION_TYPE.REGULAR);

    jest.spyOn(core.service!.conversation!, 'mlsGroupExistsLocally').mockResolvedValue(true);
    mockSafeEpoch(core);
    jest.spyOn(core.service!.mls!, 'scheduleKeyMaterialRenewal');

    const conversationRepository = await testFactory.exposeConversationActors();
    await initMLSGroupConversations(mlsConversations, conversationRepository, {core});

    for (const conversation of mlsConversations) {
      expect(core.service!.mls!.scheduleKeyMaterialRenewal).toHaveBeenCalledWith(conversation.groupId);
    }
  });

  describe('initialiseSelfAndTeamConversations', () => {
    it('register unestablished team and self mls conversations', async () => {
      const core = new Account();
      const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);

      const selfConversation = createMLSConversation(CONVERSATION_TYPE.SELF);

      const teamConversation = createMLSConversation(CONVERSATION_TYPE.GLOBAL_TEAM);
      jest.spyOn(core.service!.conversation!, 'mlsGroupExistsLocally').mockResolvedValue(true);
      jest.spyOn(core.service!.mls!, 'scheduleKeyMaterialRenewal');

      const mlsConversations = createMLSConversations(nbMLSConversations);
      const conversations = [teamConversation, ...mlsConversations, selfConversation];
      mockSafeEpoch(core);

      const conversationRepository = await testFactory.exposeConversationActors();

      await initialiseSelfAndTeamConversations(
        conversations,
        conversationRepository,
        new User('', '', translateForTest),
        'client-1',
        core,
      );

      expect(core.service!.mls!.registerConversation).toHaveBeenCalledTimes(2);
    });

    it('does not register self and team conversation that have epoch > 0', async () => {
      const core = new Account();
      const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);

      const selfConversation = createMLSConversation();
      selfConversation.epoch = 1;
      selfConversation.type(CONVERSATION_TYPE.SELF);

      const teamConversation = createMLSConversation();
      teamConversation.epoch = 2;
      teamConversation.type(CONVERSATION_TYPE.GLOBAL_TEAM);

      const mlsConversations = createMLSConversations(nbMLSConversations);
      const conversations = [teamConversation, ...mlsConversations, selfConversation];

      const conversationRepository = await testFactory.exposeConversationActors();
      const repositoryCore = (conversationRepository as any).core as Core;
      jest.spyOn(repositoryCore.service!.conversation, 'mlsGroupExistsLocally').mockResolvedValue(true);
      mockSafeEpoch(core);

      await initialiseSelfAndTeamConversations(
        conversations,
        conversationRepository,
        new User('', '', translateForTest),
        'clientId',
        core,
      );

      expect(core.service!.mls!.registerConversation).toHaveBeenCalledTimes(0);
    });

    it('joins self and team conversation with external commit that have epoch > 0', async () => {
      const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);

      const selfConversation = createMLSConversation();
      selfConversation.epoch = 1;
      selfConversation.type(CONVERSATION_TYPE.SELF);

      const teamConversation = createMLSConversation();
      teamConversation.epoch = 2;
      teamConversation.type(CONVERSATION_TYPE.GLOBAL_TEAM);

      const mlsConversations = createMLSConversations(nbMLSConversations);
      const conversations = [teamConversation, ...mlsConversations, selfConversation];

      const conversationRepository = await testFactory.exposeConversationActors();
      const repositoryCore = (conversationRepository as any).core as Core;
      mockSafeEpoch(repositoryCore);
      // MLS group is not yet established locally
      jest.spyOn(repositoryCore.service!.mls!, 'isConversationEstablished').mockResolvedValue(false);
      jest.spyOn(repositoryCore.service!.conversation!, 'mlsGroupExistsLocally').mockResolvedValue(false);
      jest
        .spyOn(
          (conversationRepository as unknown as {conversationService: {getSafeConversationById: jest.Mock}})
            .conversationService,
          'getSafeConversationById',
        )
        .mockReturnValue(task.fromResult(result.ok({epoch: 1})));

      const joinSpy = jest.spyOn(repositoryCore.service!.conversation!, 'joinByExternalCommit');
      await initialiseSelfAndTeamConversations(
        conversations,
        conversationRepository,
        new User('', '', translateForTest),
        'clientId',
        repositoryCore,
      );

      expect(repositoryCore.service!.mls!.registerConversation).toHaveBeenCalledTimes(0);
      expect(joinSpy).toHaveBeenCalledTimes(2);
    });

    it('DOES NOT join self and team conversation with external commit that have epoch > 0, but is already established locally', async () => {
      const core = new Account();
      const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);

      const selfConversation = createMLSConversation();
      selfConversation.epoch = 1;
      selfConversation.type(CONVERSATION_TYPE.SELF);

      const teamConversation = createMLSConversation();
      teamConversation.epoch = 2;
      teamConversation.type(CONVERSATION_TYPE.GLOBAL_TEAM);

      const mlsConversations = createMLSConversations(nbMLSConversations);
      const conversations = [teamConversation, ...mlsConversations, selfConversation];

      jest.spyOn(core.service!.mls!, 'isConversationEstablished').mockResolvedValue(true);

      const conversationRepository = await testFactory.exposeConversationActors();
      mockSafeEpoch(core);

      await initialiseSelfAndTeamConversations(
        conversations,
        conversationRepository,
        new User('', '', translateForTest),
        'clientId',
        core,
      );

      expect(core.service!.mls!.registerConversation).not.toHaveBeenCalled();
      expect(core.service!.conversation!.joinByExternalCommit).not.toHaveBeenCalled();
    });
  });

  describe('classifyLocal', () => {
    it('returns "missing" when the group does not exist locally regardless of epoch', () => {
      expect(classifyLocal({existsLocally: false, epoch: {kind: 'epoch', value: 0}})).toEqual({kind: 'missing'});
      expect(classifyLocal({existsLocally: false, epoch: {kind: 'epoch', value: 5}})).toEqual({kind: 'missing'});
      expect(classifyLocal({existsLocally: false, epoch: {kind: 'unreadable', error: new Error('x')}})).toEqual({
        kind: 'missing',
      });
    });

    it('returns "epochUnreadable" carrying the original error when local exists but epoch is unreadable', () => {
      const error = new Error('cc-failure');
      expect(classifyLocal({existsLocally: true, epoch: {kind: 'unreadable', error}})).toEqual({
        kind: 'epochUnreadable',
        error,
      });
    });

    it('returns "alreadyEstablished" when local exists and epoch > 0', () => {
      expect(classifyLocal({existsLocally: true, epoch: {kind: 'epoch', value: 1}})).toEqual({
        kind: 'alreadyEstablished',
      });
      expect(classifyLocal({existsLocally: true, epoch: {kind: 'epoch', value: 999}})).toEqual({
        kind: 'alreadyEstablished',
      });
    });

    it('returns "staleNeedsWipe" when local exists and epoch is 0', () => {
      expect(classifyLocal({existsLocally: true, epoch: {kind: 'epoch', value: 0}})).toEqual({kind: 'staleNeedsWipe'});
    });

    it('returns "staleNeedsWipe" for any non-positive epoch when local exists (catch-all)', () => {
      expect(classifyLocal({existsLocally: true, epoch: {kind: 'epoch', value: -1}})).toEqual({kind: 'staleNeedsWipe'});
    });
  });

  describe('classifyRemote', () => {
    it('returns "unreadable" carrying the error when reading failed', () => {
      const error = new Error('boom');
      expect(classifyRemote({kind: 'unreadable', error})).toEqual({kind: 'unreadable', error});
    });

    it('returns "establish" with epoch 0 when remote epoch is 0', () => {
      expect(classifyRemote({kind: 'epoch', value: 0})).toEqual({kind: 'establish', epoch: 0});
    });

    it('returns "joinExisting" with the epoch value when remote epoch > 0', () => {
      expect(classifyRemote({kind: 'epoch', value: 1})).toEqual({kind: 'joinExisting', epoch: 1});
      expect(classifyRemote({kind: 'epoch', value: 42})).toEqual({kind: 'joinExisting', epoch: 42});
    });
  });

  describe('readLocalMLSState', () => {
    const groupId = 'group-id';

    it('returns existsLocally and an "epoch" reading when getSafeEpoch succeeds', async () => {
      const conversationService = {
        mlsGroupExistsLocally: jest.fn().mockResolvedValue(true),
      } as unknown as ConversationService;
      const mlsService = {
        getSafeEpoch: jest.fn().mockResolvedValue(task.fromResult(result.ok(5))),
      } as unknown as MLSService;

      const state = await readLocalMLSState(groupId, conversationService, mlsService);

      expect(state).toEqual({existsLocally: true, epoch: {kind: 'epoch', value: 5}});
    });

    it('lifts a getSafeEpoch error into an "unreadable" reading', async () => {
      const error = new Error('cc-failure');
      const conversationService = {
        mlsGroupExistsLocally: jest.fn().mockResolvedValue(true),
      } as unknown as ConversationService;
      const mlsService = {
        getSafeEpoch: jest.fn().mockResolvedValue(task.fromResult(result.err(error))),
      } as unknown as MLSService;

      const state = await readLocalMLSState(groupId, conversationService, mlsService);

      expect(state).toEqual({existsLocally: true, epoch: {kind: 'unreadable', error}});
    });
  });

  describe('fetchRemoteEpoch', () => {
    const conversationId: QualifiedId = {id: 'conv-id', domain: 'wire.com'};

    const makeConversationService = (response: ReturnType<typeof result.ok> | ReturnType<typeof result.err>) =>
      ({
        getSafeConversationById: jest.fn().mockResolvedValue(task.fromResult(response)),
      }) as unknown as ConversationService;

    it('returns an "epoch" reading when the response carries a valid non-negative finite number', async () => {
      const conversationService = makeConversationService(result.ok({epoch: 7}));

      const reading = await fetchRemoteEpoch(conversationId, conversationService);

      expect(reading).toEqual({kind: 'epoch', value: 7});
    });

    it('accepts epoch = 0 as a valid reading (the establish-trigger case)', async () => {
      const conversationService = makeConversationService(result.ok({epoch: 0}));

      const reading = await fetchRemoteEpoch(conversationId, conversationService);

      expect(reading).toEqual({kind: 'epoch', value: 0});
    });

    it('returns "unreadable" when the fetch itself fails (Err branch)', async () => {
      const error = new Error('network');
      const conversationService = makeConversationService(result.err(error));

      const reading = await fetchRemoteEpoch(conversationId, conversationService);

      expect(reading).toEqual({kind: 'unreadable', error});
    });

    it('returns "unreadable" when epoch is missing from the response', async () => {
      const conversationService = makeConversationService(result.ok({epoch: undefined}));

      const reading = await fetchRemoteEpoch(conversationId, conversationService);

      expect(reading.kind).toBe('unreadable');
    });

    it('returns "unreadable" for non-number epoch values', async () => {
      const conversationService = makeConversationService(result.ok({epoch: 'not-a-number'}));

      const reading = await fetchRemoteEpoch(conversationId, conversationService);

      expect(reading.kind).toBe('unreadable');
    });

    it('returns "unreadable" for negative epochs', async () => {
      const conversationService = makeConversationService(result.ok({epoch: -1}));

      const reading = await fetchRemoteEpoch(conversationId, conversationService);

      expect(reading.kind).toBe('unreadable');
    });

    it('returns "unreadable" for NaN epochs', async () => {
      const conversationService = makeConversationService(result.ok({epoch: NaN}));

      const reading = await fetchRemoteEpoch(conversationId, conversationService);

      expect(reading.kind).toBe('unreadable');
    });

    it('returns "unreadable" for Infinity epochs', async () => {
      const conversationService = makeConversationService(result.ok({epoch: Infinity}));

      const reading = await fetchRemoteEpoch(conversationId, conversationService);

      expect(reading.kind).toBe('unreadable');
    });
  });

  describe('ensureMLSGroupIsEstablished', () => {
    const groupId = 'group-id';
    const conversationId: QualifiedId = {id: 'conv-id', domain: 'wire.com'};

    const makeDeps = (overrides: {
      existsLocally?: boolean;
      safeEpoch?: ReturnType<typeof result.ok> | ReturnType<typeof result.err>;
      safeRemote?: ReturnType<typeof result.ok> | ReturnType<typeof result.err>;
    }) => {
      const wipeMLSConversation = jest.fn().mockResolvedValue(undefined);
      const joinByExternalCommit = jest.fn().mockResolvedValue(undefined);
      const establishMLSGroupConversationCore = jest.fn().mockResolvedValue(undefined);

      const core = {
        service: {
          mls: {
            getSafeEpoch: jest.fn().mockResolvedValue(task.fromResult(overrides.safeEpoch ?? result.ok(1))),
          },
          conversation: {
            wipeMLSConversation,
            joinByExternalCommit,
            establishMLSGroupConversation: establishMLSGroupConversationCore,
          },
        },
      } as unknown as Account;

      const conversationService = {
        mlsGroupExistsLocally: jest.fn().mockResolvedValue(overrides.existsLocally ?? false),
        getSafeConversationById: jest
          .fn()
          .mockResolvedValue(task.fromResult(overrides.safeRemote ?? result.ok({epoch: 1}))),
      } as unknown as ConversationService;

      const userState = {
        self: jest.fn().mockReturnValue({
          localClient: {id: 'client-1'},
          qualifiedId: {id: 'self-id', domain: 'wire.com'},
        }),
      } as unknown as UserState;

      const conversationState = {
        findConversation: jest.fn().mockReturnValue({participating_user_ids: jest.fn().mockReturnValue([])}),
      } as unknown as ConversationState;

      return {
        deps: {core, conversationService, userState, conversationState},
        spies: {wipeMLSConversation, joinByExternalCommit, establishMLSGroupConversationCore},
      };
    };

    it('does nothing when the local group is already established (epoch > 0)', async () => {
      const {deps, spies} = makeDeps({existsLocally: true, safeEpoch: result.ok(3)});

      await ensureMLSGroupIsEstablished(groupId, conversationId, deps);

      expect(spies.wipeMLSConversation).not.toHaveBeenCalled();
      expect(spies.joinByExternalCommit).not.toHaveBeenCalled();
      expect(spies.establishMLSGroupConversationCore).not.toHaveBeenCalled();
      expect(deps.conversationService.getSafeConversationById).not.toHaveBeenCalled();
    });

    it('joins by external commit when local is missing and remote epoch > 0', async () => {
      const {deps, spies} = makeDeps({existsLocally: false, safeRemote: result.ok({epoch: 5})});

      await ensureMLSGroupIsEstablished(groupId, conversationId, deps);

      expect(spies.wipeMLSConversation).not.toHaveBeenCalled();
      expect(spies.joinByExternalCommit).toHaveBeenCalledWith(conversationId);
    });

    it('wipes a stale local group (epoch=0) before reconciling with the backend', async () => {
      const {deps, spies} = makeDeps({
        existsLocally: true,
        safeEpoch: result.ok(0),
        safeRemote: result.ok({epoch: 5}),
      });

      await ensureMLSGroupIsEstablished(groupId, conversationId, deps);

      expect(spies.wipeMLSConversation).toHaveBeenCalledWith(groupId);
      expect(spies.joinByExternalCommit).toHaveBeenCalledWith(conversationId);
      expect(spies.wipeMLSConversation.mock.invocationCallOrder[0]).toBeLessThan(
        spies.joinByExternalCommit.mock.invocationCallOrder[0],
      );
    });

    it('wipes the local group when the local epoch is unreadable, then reconciles with the backend', async () => {
      const epochError = new Error('cc-broke');
      const {deps, spies} = makeDeps({
        existsLocally: true,
        safeEpoch: result.err(epochError),
        safeRemote: result.ok({epoch: 5}),
      });

      await ensureMLSGroupIsEstablished(groupId, conversationId, deps);

      expect(spies.wipeMLSConversation).toHaveBeenCalledWith(groupId);
      expect(spies.joinByExternalCommit).toHaveBeenCalledWith(conversationId);
    });

    it('throws an error wrapping the original cause when the remote epoch cannot be read', async () => {
      const networkError = new Error('connection-refused');
      const {deps, spies} = makeDeps({existsLocally: false, safeRemote: result.err(networkError)});

      await expect(ensureMLSGroupIsEstablished(groupId, conversationId, deps)).rejects.toMatchObject({
        message: 'Could not read remote MLS epoch',
        cause: networkError,
      });
      expect(spies.joinByExternalCommit).not.toHaveBeenCalled();
      expect(spies.establishMLSGroupConversationCore).not.toHaveBeenCalled();
    });

    it('throws when the remote epoch is not a non-negative finite number', async () => {
      const {deps, spies} = makeDeps({existsLocally: false, safeRemote: result.ok({epoch: -1})});

      await expect(ensureMLSGroupIsEstablished(groupId, conversationId, deps)).rejects.toMatchObject({
        message: 'Could not read remote MLS epoch',
      });
      expect(spies.joinByExternalCommit).not.toHaveBeenCalled();
    });
  });
});
