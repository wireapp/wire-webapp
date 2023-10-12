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

import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import {TeamFeatureConfigurationUpdateEvent, TEAM_EVENT} from '@wireapp/api-client/lib/event';
import {FeatureList, FeatureStatus} from '@wireapp/api-client/lib/team';
import {FEATURE_KEY} from '@wireapp/api-client/lib/team/feature';
import {act} from 'react-dom/test-utils';
import {container} from 'tsyringe';

import {TestFactory} from 'test/helper/TestFactory';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {SelfRepository} from './SelfRepository';
import * as SelfSupportedProtocols from './SelfSupportedProtocols/SelfSupportedProtocols';

import {ClientEntity} from '../client';
import {Core} from '../service/CoreSingleton';

const testFactory = new TestFactory();

const generateMLSFeatureConfig = (supportedProtocols: ConversationProtocol[]) => {
  return {
    allowedCipherSuites: [1],
    defaultCipherSuite: 1,
    defaultProtocol: ConversationProtocol.PROTEUS,
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
      [[ConversationProtocol.PROTEUS], [ConversationProtocol.PROTEUS, ConversationProtocol.MLS]],
      [[ConversationProtocol.PROTEUS, ConversationProtocol.MLS], [ConversationProtocol.PROTEUS]],
      [[ConversationProtocol.PROTEUS], [ConversationProtocol.MLS]],
    ])('Updates the list of supported protocols', async (initialProtocols, evaluatedProtocols) => {
      const selfRepository = await testFactory.exposeSelfActors();

      const selfUser = selfRepository['userState'].self()!;

      selfUser.supportedProtocols(initialProtocols);

      jest.spyOn(SelfSupportedProtocols, 'evaluateSelfSupportedProtocols').mockResolvedValueOnce(evaluatedProtocols);
      jest.spyOn(selfRepository['selfService'], 'putSupportedProtocols');

      await act(async () => {
        await selfRepository.initialisePeriodicSelfSupportedProtocolsCheck();
      });

      expect(selfUser.supportedProtocols()).toEqual(evaluatedProtocols);
      expect(selfRepository['selfService'].putSupportedProtocols).toHaveBeenCalledWith(evaluatedProtocols);
    });

    it("Does not update supported protocols if they didn't change", async () => {
      const selfRepository = await testFactory.exposeSelfActors();

      const selfUser = selfRepository['userState'].self()!;

      const initialProtocols = [ConversationProtocol.PROTEUS];
      selfUser.supportedProtocols(initialProtocols);

      const evaluatedProtocols = [ConversationProtocol.PROTEUS];

      jest.spyOn(SelfSupportedProtocols, 'evaluateSelfSupportedProtocols').mockResolvedValueOnce(evaluatedProtocols);
      jest.spyOn(selfRepository['selfService'], 'putSupportedProtocols');

      await selfRepository.initialisePeriodicSelfSupportedProtocolsCheck();

      expect(selfUser.supportedProtocols()).toEqual(evaluatedProtocols);
      expect(selfRepository['selfService'].putSupportedProtocols).not.toHaveBeenCalled();
    });

    it('registers periodic supported protocols refresh task to be called every 24h', async () => {
      const selfRepository = await testFactory.exposeSelfActors();
      const core = container.resolve(Core);

      const selfUser = selfRepository['userState'].self()!;

      const initialProtocols = [ConversationProtocol.PROTEUS];
      selfUser.supportedProtocols(initialProtocols);

      const evaluatedProtocols = [ConversationProtocol.PROTEUS];

      jest.spyOn(SelfSupportedProtocols, 'evaluateSelfSupportedProtocols').mockResolvedValueOnce(evaluatedProtocols);
      jest.spyOn(core.recurringTaskScheduler, 'registerTask');

      await act(async () => {
        await selfRepository.initialisePeriodicSelfSupportedProtocolsCheck();
      });

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

      await act(async () => {
        await selfRepository.deleteSelfUserClient(clientToDelete.id);
      });

      expect(selfUser.devices()).toEqual(expectedClients);
      expect(selfRepository.refreshSelfSupportedProtocols).toHaveBeenCalled();
    });
  });

  describe('refreshSelfSupportedProtocols', () => {
    it('refreshes self supported protocols and updates backend with the new list', async () => {
      const selfRepository = await testFactory.exposeSelfActors();

      const selfUser = selfRepository['userState'].self()!;

      const initialProtocols = [ConversationProtocol.PROTEUS];
      selfUser.supportedProtocols(initialProtocols);

      const evaluatedProtocols = [ConversationProtocol.PROTEUS, ConversationProtocol.MLS];

      jest.spyOn(SelfSupportedProtocols, 'evaluateSelfSupportedProtocols').mockResolvedValueOnce(evaluatedProtocols);
      jest.spyOn(selfRepository['selfService'], 'putSupportedProtocols');

      await selfRepository.refreshSelfSupportedProtocols();

      expect(selfUser.supportedProtocols()).toEqual(evaluatedProtocols);
      expect(selfRepository['selfService'].putSupportedProtocols).toHaveBeenCalledWith(evaluatedProtocols);
    });

    it('does not update backend with supported protocols when not changed', async () => {
      const selfRepository = await testFactory.exposeSelfActors();

      const selfUser = selfRepository['userState'].self()!;

      const initialProtocols = [ConversationProtocol.PROTEUS, ConversationProtocol.MLS];
      selfUser.supportedProtocols(initialProtocols);

      const evaluatedProtocols = [ConversationProtocol.PROTEUS, ConversationProtocol.MLS];

      jest.spyOn(SelfSupportedProtocols, 'evaluateSelfSupportedProtocols').mockResolvedValueOnce(evaluatedProtocols);
      jest.spyOn(selfRepository['selfService'], 'putSupportedProtocols');

      await selfRepository.refreshSelfSupportedProtocols();

      expect(selfUser.supportedProtocols()).toEqual(evaluatedProtocols);
      expect(selfRepository['selfService'].putSupportedProtocols).not.toHaveBeenCalled();
    });

    it('refreshes self supported protocols on team supported protocols update', async () => {
      const selfRepository = await testFactory.exposeSelfActors();

      const currentSupportedProtocols = [ConversationProtocol.PROTEUS];
      const newSupportedProtocols = [ConversationProtocol.PROTEUS, ConversationProtocol.MLS];

      const mockedFeatureList: FeatureList = {
        [FEATURE_KEY.MLS]: {
          config: generateMLSFeatureConfig(currentSupportedProtocols),
          status: FeatureStatus.ENABLED,
        },
      };

      const mockedMLSFeatureUpdateEvent: TeamFeatureConfigurationUpdateEvent = {
        name: FEATURE_KEY.MLS,
        team: '',
        time: '',
        data: {
          status: FeatureStatus.ENABLED,
          config: generateMLSFeatureConfig(newSupportedProtocols),
        },

        type: TEAM_EVENT.FEATURE_CONFIG_UPDATE,
      };

      jest.spyOn(selfRepository, 'refreshSelfSupportedProtocols').mockImplementationOnce(jest.fn());

      selfRepository['teamRepository'].emit('featureUpdated', {
        event: mockedMLSFeatureUpdateEvent,
        prevFeatureList: mockedFeatureList,
      });

      expect(selfRepository.refreshSelfSupportedProtocols).toHaveBeenCalled();
    });

    it('refreshes self supported protocols on team refresh', async () => {
      const selfRepository = await testFactory.exposeSelfActors();

      const selfUser = selfRepository['userState'].self()!;

      const initialProtocols = [ConversationProtocol.PROTEUS];
      selfUser.supportedProtocols(initialProtocols);

      const evaluatedProtocols = [ConversationProtocol.PROTEUS, ConversationProtocol.MLS];

      jest.spyOn(SelfSupportedProtocols, 'evaluateSelfSupportedProtocols').mockResolvedValueOnce(evaluatedProtocols);
      jest.spyOn(selfRepository['selfService'], 'putSupportedProtocols');

      await act(async () => selfRepository['teamRepository'].emit('teamRefreshed'));

      expect(selfUser.supportedProtocols()).toEqual(evaluatedProtocols);
      expect(selfRepository['selfService'].putSupportedProtocols).toHaveBeenCalledWith(evaluatedProtocols);
    });

    it('refreshes self supported protocols after mls feature is enabled', async () => {
      const selfRepository = await testFactory.exposeSelfActors();

      const currentSupportedProtocols = [ConversationProtocol.PROTEUS, ConversationProtocol.MLS];
      const currentFeatureStatus = FeatureStatus.DISABLED;

      const newSupportedProtocols = [ConversationProtocol.PROTEUS, ConversationProtocol.MLS];
      const newFeatureStatus = FeatureStatus.ENABLED;

      const mockedFeatureList: FeatureList = {
        [FEATURE_KEY.MLS]: {
          config: generateMLSFeatureConfig(currentSupportedProtocols),
          status: currentFeatureStatus,
        },
      };

      const mockedMLSFeatureUpdateEvent: TeamFeatureConfigurationUpdateEvent = {
        name: FEATURE_KEY.MLS,
        team: '',
        time: '',
        data: {
          status: newFeatureStatus,
          config: generateMLSFeatureConfig(newSupportedProtocols),
        },

        type: TEAM_EVENT.FEATURE_CONFIG_UPDATE,
      };

      jest.spyOn(selfRepository, 'refreshSelfSupportedProtocols').mockImplementationOnce(jest.fn());

      selfRepository['teamRepository'].emit('featureUpdated', {
        event: mockedMLSFeatureUpdateEvent,
        prevFeatureList: mockedFeatureList,
      });

      expect(selfRepository.refreshSelfSupportedProtocols).toHaveBeenCalled();
    });

    it('does not refresh self supported protocols if mls feature is updated without supported protocols change', async () => {
      const selfRepository = await testFactory.exposeSelfActors();

      const currentSupportedProtocols = [ConversationProtocol.PROTEUS, ConversationProtocol.MLS];
      const newSupportedProtocols = [ConversationProtocol.PROTEUS, ConversationProtocol.MLS];

      const mockedFeatureList: FeatureList = {
        [FEATURE_KEY.MLS]: {
          config: generateMLSFeatureConfig(currentSupportedProtocols),
          status: FeatureStatus.ENABLED,
        },
      };

      const mockedMLSFeatureUpdateEvent: TeamFeatureConfigurationUpdateEvent = {
        name: FEATURE_KEY.MLS,
        team: '',
        time: '',
        data: {
          status: FeatureStatus.ENABLED,
          config: generateMLSFeatureConfig(newSupportedProtocols),
        },

        type: TEAM_EVENT.FEATURE_CONFIG_UPDATE,
      };

      jest.spyOn(selfRepository, 'refreshSelfSupportedProtocols').mockImplementationOnce(jest.fn());

      selfRepository['teamRepository'].emit('featureUpdated', {
        event: mockedMLSFeatureUpdateEvent,
        prevFeatureList: mockedFeatureList,
      });

      expect(selfRepository.refreshSelfSupportedProtocols).not.toHaveBeenCalled();
    });
  });
});
