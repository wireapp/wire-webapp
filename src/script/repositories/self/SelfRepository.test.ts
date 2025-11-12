/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {waitFor} from '@testing-library/react';
import {FeatureList} from '@wireapp/api-client/lib/team';
import {CONVERSATION_PROTOCOL, FEATURE_KEY, FEATURE_STATUS} from '@wireapp/api-client/lib/team/feature';
import {container} from 'tsyringe';

import {ClientEntity} from 'Repositories/client';
import {TestFactory} from 'test/helper/TestFactory';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {SelfRepository} from './SelfRepository';
import * as SelfSupportedProtocols from './SelfSupportedProtocols/SelfSupportedProtocols';

import {Core} from '../../service/CoreSingleton';

const testFactory = new TestFactory();

const generateMLSFeatureConfig = (supportedProtocols: CONVERSATION_PROTOCOL[]) => {
  return {
    allowedCipherSuites: [1],
    defaultCipherSuite: 1,
    defaultProtocol: CONVERSATION_PROTOCOL.PROTEUS,
    protocolToggleUsers: [] as string[],
    supportedProtocols,
  };
};

describe('SelfRepository', () => {
  describe('initialisePeriodicSelfSupportedProtocolsCheck', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it.each([
      [[CONVERSATION_PROTOCOL.PROTEUS], [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]],
      [[CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS], [CONVERSATION_PROTOCOL.PROTEUS]],
      [[CONVERSATION_PROTOCOL.PROTEUS], [CONVERSATION_PROTOCOL.MLS]],
    ])('Updates the list of supported protocols', async (initialProtocols, evaluatedProtocols) => {
      const selfRepository = await testFactory.exposeSelfActors();

      const selfUser = selfRepository['userState'].self()!;

      selfUser.supportedProtocols(initialProtocols);

      jest.spyOn(SelfSupportedProtocols, 'evaluateSelfSupportedProtocols').mockResolvedValueOnce(evaluatedProtocols);
      jest.spyOn(selfRepository['selfService'], 'putSupportedProtocols');
      jest.spyOn(selfRepository['selfService'], 'getSelf').mockResolvedValueOnce({
        locale: 'test',
        qualified_id: {domain: 'test-domain', id: 'test-id'},
        id: 'test-id',
        name: 'test-name',
      });

      void selfRepository.initialisePeriodicSelfSupportedProtocolsCheck();

      await waitFor(() => {
        expect(selfUser.supportedProtocols()).toEqual(evaluatedProtocols);
        expect(selfRepository['selfService'].putSupportedProtocols).toHaveBeenCalledWith(evaluatedProtocols);
      });
    });

    it("Does not update supported protocols if they didn't change", async () => {
      const selfRepository = await testFactory.exposeSelfActors();

      const selfUser = selfRepository['userState'].self()!;

      const initialProtocols = [CONVERSATION_PROTOCOL.PROTEUS];
      selfUser.supportedProtocols(initialProtocols);

      const evaluatedProtocols = [CONVERSATION_PROTOCOL.PROTEUS];

      jest.spyOn(SelfSupportedProtocols, 'evaluateSelfSupportedProtocols').mockResolvedValueOnce(evaluatedProtocols);
      jest.spyOn(selfRepository['selfService'], 'putSupportedProtocols');
      jest.spyOn(selfRepository['selfService'], 'getSelf').mockResolvedValueOnce({
        locale: 'test',
        qualified_id: {domain: 'test-domain', id: 'test-id'},
        id: 'test-id',
        name: 'test-name',
      });

      await selfRepository.initialisePeriodicSelfSupportedProtocolsCheck();

      expect(selfUser.supportedProtocols()).toEqual(evaluatedProtocols);
      expect(selfRepository['selfService'].putSupportedProtocols).not.toHaveBeenCalled();
    });

    it('registers periodic supported protocols refresh task to be called every 24h', async () => {
      const selfRepository = await testFactory.exposeSelfActors();
      const core = container.resolve(Core);

      const selfUser = selfRepository['userState'].self()!;

      const initialProtocols = [CONVERSATION_PROTOCOL.PROTEUS];
      selfUser.supportedProtocols(initialProtocols);

      const evaluatedProtocols = [CONVERSATION_PROTOCOL.PROTEUS];

      jest.spyOn(SelfSupportedProtocols, 'evaluateSelfSupportedProtocols').mockResolvedValueOnce(evaluatedProtocols);
      jest.spyOn(core.recurringTaskScheduler, 'registerTask');
      jest.spyOn(selfRepository['selfService'], 'getSelf').mockResolvedValueOnce({
        locale: 'test',
        qualified_id: {domain: 'test-domain', id: 'test-id'},
        id: 'test-id',
        name: 'test-name',
      });

      await selfRepository.initialisePeriodicSelfSupportedProtocolsCheck();

      expect(core.recurringTaskScheduler.registerTask).toHaveBeenCalledWith({
        every: TIME_IN_MILLIS.DAY,
        key: SelfRepository.SELF_SUPPORTED_PROTOCOLS_CHECK_KEY,
        task: expect.anything(),
      });

      expect(selfUser.supportedProtocols()).toEqual(evaluatedProtocols);
    });
  });

  describe('deleteSelfUserClient', () => {
    it('deletes the self user client and refreshes self supported protocols', async () => {
      const selfRepository = await testFactory.exposeSelfActors();

      const selfUser = selfRepository['userState'].self()!;

      selfRepository['clientRepository'].init(selfUser);

      const client1 = new ClientEntity(true, null, 'client1');
      const client2 = new ClientEntity(true, null, 'client2');

      const initialClients = [client1, client2];
      selfUser.devices(initialClients);

      const clientToDelete = initialClients[0];

      jest.spyOn(container.resolve(Core).service?.client!, 'deleteClient');
      jest.spyOn(selfRepository, 'refreshSelfSupportedProtocols').mockImplementationOnce(jest.fn());

      const expectedClients = [...initialClients].filter(client => client.id !== clientToDelete.id);

      await selfRepository.deleteSelfUserClient(clientToDelete.id);

      expect(selfUser.devices()).toEqual(expectedClients);
      expect(selfRepository.refreshSelfSupportedProtocols).toHaveBeenCalled();
    });
  });

  describe('refreshSelfSupportedProtocols', () => {
    it('refreshes self supported protocols and updates backend with the new list', async () => {
      const selfRepository = await testFactory.exposeSelfActors();

      const selfUser = selfRepository['userState'].self()!;

      const initialProtocols = [CONVERSATION_PROTOCOL.PROTEUS];
      selfUser.supportedProtocols(initialProtocols);

      const evaluatedProtocols = [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS];

      jest.spyOn(SelfSupportedProtocols, 'evaluateSelfSupportedProtocols').mockResolvedValueOnce(evaluatedProtocols);
      jest.spyOn(selfRepository['selfService'], 'putSupportedProtocols');
      jest.spyOn(selfRepository['selfService'], 'getSelf').mockResolvedValueOnce({
        locale: 'test',
        qualified_id: {domain: 'test-domain', id: 'test-id'},
        id: 'test-id',
        name: 'test-name',
      });

      await selfRepository.refreshSelfSupportedProtocols();

      expect(selfUser.supportedProtocols()).toEqual(evaluatedProtocols);
      expect(selfRepository['selfService'].putSupportedProtocols).toHaveBeenCalledWith(evaluatedProtocols);
    });

    it('does not update backend with supported protocols when not changed', async () => {
      const selfRepository = await testFactory.exposeSelfActors();

      const selfUser = selfRepository['userState'].self()!;

      const initialProtocols = [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS];
      selfUser.supportedProtocols(initialProtocols);

      const evaluatedProtocols = [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS];

      jest.spyOn(SelfSupportedProtocols, 'evaluateSelfSupportedProtocols').mockResolvedValueOnce(evaluatedProtocols);
      jest.spyOn(selfRepository['selfService'], 'putSupportedProtocols');
      jest.spyOn(selfRepository['selfService'], 'getSelf').mockResolvedValueOnce({
        locale: 'test',
        qualified_id: {domain: 'test-domain', id: 'test-id'},
        id: 'test-id',
        name: 'test-name',
      });

      await selfRepository.refreshSelfSupportedProtocols();

      expect(selfUser.supportedProtocols()).toEqual(evaluatedProtocols);
      expect(selfRepository['selfService'].putSupportedProtocols).not.toHaveBeenCalled();
    });

    it('refreshes self supported protocols on team supported protocols update', async () => {
      const selfRepository = await testFactory.exposeSelfActors();

      const currentSupportedProtocols = [CONVERSATION_PROTOCOL.PROTEUS];
      const newSupportedProtocols = [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS];

      const mockedFeatureList: FeatureList = {
        [FEATURE_KEY.MLS]: {
          config: generateMLSFeatureConfig(currentSupportedProtocols),
          status: FEATURE_STATUS.ENABLED,
        },
      };

      const mockedNewFeatureList: FeatureList = {
        [FEATURE_KEY.MLS]: {
          config: generateMLSFeatureConfig(newSupportedProtocols),
          status: FEATURE_STATUS.ENABLED,
        },
      };

      jest.spyOn(selfRepository, 'refreshSelfSupportedProtocols').mockImplementationOnce(jest.fn());

      selfRepository['teamRepository'].emit('featureConfigUpdated', {
        prevFeatureList: mockedFeatureList,
        newFeatureList: mockedNewFeatureList,
      });

      expect(selfRepository.refreshSelfSupportedProtocols).toHaveBeenCalled();
    });

    it('refreshes self supported protocols after mls feature is enabled', async () => {
      const selfRepository = await testFactory.exposeSelfActors();

      const currentSupportedProtocols = [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS];
      const currentFeatureStatus = FEATURE_STATUS.DISABLED;

      const newSupportedProtocols = [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS];
      const newFeatureStatus = FEATURE_STATUS.ENABLED;

      const mockedFeatureList: FeatureList = {
        [FEATURE_KEY.MLS]: {
          config: generateMLSFeatureConfig(currentSupportedProtocols),
          status: currentFeatureStatus,
        },
      };

      const mockedNewFeatureList: FeatureList = {
        [FEATURE_KEY.MLS]: {
          config: generateMLSFeatureConfig(newSupportedProtocols),
          status: newFeatureStatus,
        },
      };

      jest.spyOn(selfRepository, 'refreshSelfSupportedProtocols').mockImplementationOnce(jest.fn());

      selfRepository['teamRepository'].emit('featureConfigUpdated', {
        prevFeatureList: mockedFeatureList,
        newFeatureList: mockedNewFeatureList,
      });

      // Await for async work caused by event emitter to finish
      await Promise.resolve();
      expect(selfRepository.refreshSelfSupportedProtocols).toHaveBeenCalled();
    });

    it('does not refresh self supported protocols if mls feature is updated without supported protocols change', async () => {
      const selfRepository = await testFactory.exposeSelfActors();

      const currentSupportedProtocols = [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS];
      const newSupportedProtocols = [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS];

      const mockedFeatureList: FeatureList = {
        [FEATURE_KEY.MLS]: {
          config: generateMLSFeatureConfig(currentSupportedProtocols),
          status: FEATURE_STATUS.ENABLED,
        },
      };

      const mockedNewFeatureList: FeatureList = {
        [FEATURE_KEY.MLS]: {
          config: generateMLSFeatureConfig(newSupportedProtocols),
          status: FEATURE_STATUS.ENABLED,
        },
      };

      jest.spyOn(selfRepository, 'refreshSelfSupportedProtocols').mockImplementationOnce(jest.fn());

      selfRepository['teamRepository'].emit('featureConfigUpdated', {
        prevFeatureList: mockedFeatureList,
        newFeatureList: mockedNewFeatureList,
      });

      await Promise.resolve();
      expect(selfRepository.refreshSelfSupportedProtocols).not.toHaveBeenCalled();
    });

    it('refreshes self supported protocols on mls migration feature config update', async () => {
      const selfRepository = await testFactory.exposeSelfActors();

      const mockedFeatureList: FeatureList = {
        [FEATURE_KEY.MLS_MIGRATION]: {
          config: {},
          status: FEATURE_STATUS.DISABLED,
        },
      };

      const mockedNewFeatureList: FeatureList = {
        [FEATURE_KEY.MLS_MIGRATION]: {
          config: {},
          status: FEATURE_STATUS.ENABLED,
        },
      };

      jest.spyOn(selfRepository, 'refreshSelfSupportedProtocols').mockImplementationOnce(jest.fn());

      selfRepository['teamRepository'].emit('featureConfigUpdated', {
        prevFeatureList: mockedFeatureList,
        newFeatureList: mockedNewFeatureList,
      });

      await Promise.resolve();
      expect(selfRepository.refreshSelfSupportedProtocols).toHaveBeenCalled();
    });
  });
});
