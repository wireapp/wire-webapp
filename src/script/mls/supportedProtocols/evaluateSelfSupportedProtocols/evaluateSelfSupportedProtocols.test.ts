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

import {RegisteredClient} from '@wireapp/api-client/lib/client';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import {FeatureList, FeatureStatus} from '@wireapp/api-client/lib/team';

import {APIClient} from '@wireapp/api-client';

import {TestFactory} from 'test/helper/TestFactory';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {evaluateSelfSupportedProtocols} from './evaluateSelfSupportedProtocols';

import * as mlsSupport from '../../isMLSSupportedByEnvironment';
import {MLSMigrationStatus} from '../../MLSMigration/migrationStatus';

const testFactory = new TestFactory();

jest.spyOn(mlsSupport, 'isMLSSupportedByEnvironment').mockResolvedValue(true);

const generateMLSFeaturesConfig = (migrationStatus: MLSMigrationStatus, supportedProtocols: ConversationProtocol[]) => {
  const now = Date.now();

  switch (migrationStatus) {
    case MLSMigrationStatus.DISABLED:
      return {
        mls: {
          status: FeatureStatus.ENABLED,
          config: {supportedProtocols},
        },
        mlsMigration: {status: FeatureStatus.DISABLED, config: {}},
      };
    case MLSMigrationStatus.NOT_STARTED:
      return {
        mls: {
          status: FeatureStatus.ENABLED,
          config: {supportedProtocols},
        },
        mlsMigration: {
          status: FeatureStatus.ENABLED,
          config: {
            startTime: new Date(now + 1 * TIME_IN_MILLIS.DAY).toISOString(),
            finaliseRegardlessAfter: new Date(now + 2 * TIME_IN_MILLIS.DAY).toISOString(),
          },
        },
      };
    case MLSMigrationStatus.ONGOING:
      return {
        mls: {
          status: FeatureStatus.ENABLED,
          config: {supportedProtocols},
        },
        mlsMigration: {
          status: FeatureStatus.ENABLED,
          config: {
            startTime: new Date(now - 1 * TIME_IN_MILLIS.DAY).toISOString(),
            finaliseRegardlessAfter: new Date(now + 1 * TIME_IN_MILLIS.DAY).toISOString(),
          },
        },
      };
    case MLSMigrationStatus.FINALISED:
      return {
        mls: {
          status: FeatureStatus.ENABLED,
          config: {supportedProtocols},
        },
        mlsMigration: {
          status: FeatureStatus.ENABLED,
          config: {
            startTime: new Date(now - 2 * TIME_IN_MILLIS.DAY).toISOString(),
            finaliseRegardlessAfter: new Date(now - 1 * TIME_IN_MILLIS.DAY).toISOString(),
          },
        },
      };
  }
};

const createMockClientResponse = (doesSupportMLS = false, wasActiveWithinLast4Weeks = false) => {
  return {
    mls_public_keys: doesSupportMLS ? {ed25519: 'key'} : undefined,
    last_active: wasActiveWithinLast4Weeks
      ? new Date().toISOString()
      : new Date(Date.now() - 5 * 7 * 24 * 60 * 60 * 1000).toISOString(),
  } as unknown as RegisteredClient;
};

const generateListOfSelfClients = ({allActiveClientsMLSCapable}: {allActiveClientsMLSCapable: boolean}) => {
  const clients: RegisteredClient[] = [];

  new Array(4).fill(0).forEach(() => clients.push(createMockClientResponse(true, true)));
  if (!allActiveClientsMLSCapable) {
    new Array(2).fill(0).forEach(() => clients.push(createMockClientResponse(false, true)));
  }

  return clients;
};

const testScenarios = [
  [
    //with given config
    generateMLSFeaturesConfig(MLSMigrationStatus.DISABLED, [ConversationProtocol.PROTEUS]),

    //we expect the following result based on whether all active clients are MLS capable or not
    {
      allActiveClientsMLSCapable: new Set([ConversationProtocol.PROTEUS]),
      someActiveClientsNotMLSCapable: new Set([ConversationProtocol.PROTEUS]),
    },
  ],
  [
    generateMLSFeaturesConfig(MLSMigrationStatus.DISABLED, [ConversationProtocol.PROTEUS, ConversationProtocol.MLS]),
    {
      allActiveClientsMLSCapable: new Set([ConversationProtocol.PROTEUS, ConversationProtocol.MLS]),
      someActiveClientsNotMLSCapable: new Set([ConversationProtocol.PROTEUS]),
    },
  ],
  [
    generateMLSFeaturesConfig(MLSMigrationStatus.DISABLED, [ConversationProtocol.MLS]),
    {
      allActiveClientsMLSCapable: new Set([ConversationProtocol.MLS]),
      someActiveClientsNotMLSCapable: new Set([ConversationProtocol.MLS]),
    },
  ],
  [
    generateMLSFeaturesConfig(MLSMigrationStatus.NOT_STARTED, [ConversationProtocol.PROTEUS, ConversationProtocol.MLS]),
    {
      allActiveClientsMLSCapable: new Set([ConversationProtocol.PROTEUS, ConversationProtocol.MLS]),
      someActiveClientsNotMLSCapable: new Set([ConversationProtocol.PROTEUS]),
    },
  ],
  [
    generateMLSFeaturesConfig(MLSMigrationStatus.NOT_STARTED, [ConversationProtocol.MLS]),
    {
      allActiveClientsMLSCapable: new Set([ConversationProtocol.PROTEUS, ConversationProtocol.MLS]),
      someActiveClientsNotMLSCapable: new Set([ConversationProtocol.PROTEUS]),
    },
  ],
  [
    generateMLSFeaturesConfig(MLSMigrationStatus.ONGOING, [ConversationProtocol.PROTEUS, ConversationProtocol.MLS]),
    {
      allActiveClientsMLSCapable: new Set([ConversationProtocol.PROTEUS, ConversationProtocol.MLS]),
      someActiveClientsNotMLSCapable: new Set([ConversationProtocol.PROTEUS]),
    },
  ],
  [
    generateMLSFeaturesConfig(MLSMigrationStatus.ONGOING, [ConversationProtocol.MLS]),
    {
      allActiveClientsMLSCapable: new Set([ConversationProtocol.PROTEUS, ConversationProtocol.MLS]),
      someActiveClientsNotMLSCapable: new Set([ConversationProtocol.PROTEUS]),
    },
  ],
  [
    generateMLSFeaturesConfig(MLSMigrationStatus.FINALISED, [ConversationProtocol.PROTEUS, ConversationProtocol.MLS]),
    {
      allActiveClientsMLSCapable: new Set([ConversationProtocol.PROTEUS, ConversationProtocol.MLS]),
      someActiveClientsNotMLSCapable: new Set([ConversationProtocol.PROTEUS, ConversationProtocol.MLS]),
    },
  ],
  [
    generateMLSFeaturesConfig(MLSMigrationStatus.FINALISED, [ConversationProtocol.MLS]),
    {
      allActiveClientsMLSCapable: new Set([ConversationProtocol.MLS]),
      someActiveClientsNotMLSCapable: new Set([ConversationProtocol.MLS]),
    },
  ],
] as const;

describe('evaluateSelfSupportedProtocols', () => {
  describe.each([{allActiveClientsMLSCapable: true}, {allActiveClientsMLSCapable: false}])(
    '%o',
    ({allActiveClientsMLSCapable}) => {
      const selfClients = generateListOfSelfClients({allActiveClientsMLSCapable});

      it.each(testScenarios)('evaluates self supported protocols', async ({mls, mlsMigration}, expected) => {
        const mockedApiClient = {api: {client: {getClients: jest.fn()}}} as unknown as APIClient;
        const teamRepository = await testFactory.exposeTeamActors();

        jest.spyOn(mockedApiClient.api.client, 'getClients').mockResolvedValueOnce(selfClients);

        const teamFeatureList = {
          mlsMigration,
          mls,
        } as unknown as FeatureList;

        jest.spyOn(teamRepository['teamState'], 'teamFeatures').mockReturnValue(teamFeatureList);

        const supportedProtocols = await evaluateSelfSupportedProtocols({
          apiClient: mockedApiClient,
          teamRepository,
        });

        expect(supportedProtocols).toEqual(
          allActiveClientsMLSCapable ? expected.allActiveClientsMLSCapable : expected.someActiveClientsNotMLSCapable,
        );
      });
    },
  );
});
