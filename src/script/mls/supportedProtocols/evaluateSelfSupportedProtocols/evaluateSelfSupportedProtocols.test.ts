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
import {container} from 'tsyringe';

import {APIClient} from '@wireapp/api-client';

import {Core} from 'src/script/service/CoreSingleton';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {evaluateSelfSupportedProtocols} from './evaluateSelfSupportedProtocols';

import * as mlsSupport from '../../isMLSSupportedByEnvironment';
import {MLSMigrationStatus} from '../../MLSMigration/migrationStatus';

jest.spyOn(mlsSupport, 'isMLSSupportedByEnvironment').mockResolvedValue(true);

const generateMigrationDates = (migrationStatus: MLSMigrationStatus) => {
  const now = Date.now();

  switch (migrationStatus) {
    case MLSMigrationStatus.NOT_STARTED:
      return {
        startTime: new Date(now + 1 * TIME_IN_MILLIS.DAY).toISOString(),
        finaliseRegardlessAfter: new Date(now + 2 * TIME_IN_MILLIS.DAY).toISOString(),
      };
    case MLSMigrationStatus.ONGOING:
      return {
        startTime: new Date(now - 1 * TIME_IN_MILLIS.DAY).toISOString(),
        finaliseRegardlessAfter: new Date(now + 1 * TIME_IN_MILLIS.DAY).toISOString(),
      };
    case MLSMigrationStatus.FINALISED:
      return {
        startTime: new Date(now - 2 * TIME_IN_MILLIS.DAY).toISOString(),
        finaliseRegardlessAfter: new Date(now - 1 * TIME_IN_MILLIS.DAY).toISOString(),
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

const generateListOfSelfClients = ({
  activeMLS,
  activeProteus,
  nonActiveProteus,
}: {
  activeProteus: number;
  activeMLS: number;
  nonActiveProteus: number;
}) => {
  const clients: RegisteredClient[] = [];

  new Array(activeProteus).fill(0).forEach(() => clients.push(createMockClientResponse(false, true)));
  new Array(activeMLS).fill(0).forEach(() => clients.push(createMockClientResponse(true, true)));
  new Array(nonActiveProteus).fill(0).forEach(() => clients.push(createMockClientResponse(false, false)));

  return clients;
};

const cases = [
  [
    'supports both protocols when team support both protocols',
    {
      selfClients: generateListOfSelfClients({
        activeMLS: 4,
        activeProteus: 0,
        nonActiveProteus: 1,
      }),
      mls: {supportedProtocols: [ConversationProtocol.PROTEUS, ConversationProtocol.MLS]},
      mlsMigration: generateMigrationDates(MLSMigrationStatus.NOT_STARTED),
    },
    new Set([ConversationProtocol.PROTEUS, ConversationProtocol.MLS]),
  ],
  [
    "supports only proteus when team supports both, but there's at least one active client that does not support MLS",
    {
      selfClients: generateListOfSelfClients({
        activeMLS: 4,
        activeProteus: 1,
        nonActiveProteus: 1,
      }),
      mls: {supportedProtocols: [ConversationProtocol.PROTEUS, ConversationProtocol.MLS]},
      mlsMigration: generateMigrationDates(MLSMigrationStatus.NOT_STARTED),
    },
    new Set([ConversationProtocol.PROTEUS]),
  ],
  [
    'supports only proteus when team supports only proteus',
    {
      selfClients: generateListOfSelfClients({
        activeMLS: 4,
        activeProteus: 0,
        nonActiveProteus: 1,
      }),
      mls: {supportedProtocols: [ConversationProtocol.PROTEUS]},
      mlsMigration: generateMigrationDates(MLSMigrationStatus.NOT_STARTED),
    },
    new Set([ConversationProtocol.PROTEUS]),
  ],
  [
    'supports only mls when team supports only mls - migration not started',
    {
      selfClients: generateListOfSelfClients({
        activeMLS: 4,
        activeProteus: 0,
        nonActiveProteus: 1,
      }),
      mls: {supportedProtocols: [ConversationProtocol.MLS]},
      mlsMigration: generateMigrationDates(MLSMigrationStatus.NOT_STARTED),
    },
    new Set([ConversationProtocol.MLS]),
  ],
  [
    'supports only mls when team supports only mls - migration finalised',
    {
      selfClients: generateListOfSelfClients({
        activeMLS: 4,
        activeProteus: 0,
        nonActiveProteus: 1,
      }),
      mls: {supportedProtocols: [ConversationProtocol.MLS]},
      mlsMigration: generateMigrationDates(MLSMigrationStatus.FINALISED),
    },
    new Set([ConversationProtocol.MLS]),
  ],
  [
    'supports both protocols when team supports only mls - migration is ongoing',
    {
      selfClients: generateListOfSelfClients({
        activeMLS: 4,
        activeProteus: 0,
        nonActiveProteus: 1,
      }),
      mls: {supportedProtocols: [ConversationProtocol.MLS]},
      mlsMigration: generateMigrationDates(MLSMigrationStatus.ONGOING),
    },
    new Set([ConversationProtocol.PROTEUS, ConversationProtocol.MLS]),
  ],
  [
    'supports only mls when there are some users who do not support MLS but migrations has finalised',
    {
      selfClients: generateListOfSelfClients({
        activeMLS: 4,
        activeProteus: 2,
        nonActiveProteus: 1,
      }),
      mls: {supportedProtocols: [ConversationProtocol.MLS]},
      mlsMigration: generateMigrationDates(MLSMigrationStatus.FINALISED),
    },
    new Set([ConversationProtocol.MLS]),
  ],
] as const;

describe('evaluateSelfSupportedProtocols', () => {
  it.each(cases)('%s', async (name, {mls, mlsMigration, selfClients}, expected) => {
    const mockedApiClient = {api: {client: {getClients: jest.fn()}}} as unknown as APIClient;
    const mockCore = container.resolve(Core);

    jest.spyOn(mockedApiClient.api.client, 'getClients').mockResolvedValueOnce(selfClients);

    const teamFeatureList = {
      mlsMigration: {
        status: FeatureStatus.ENABLED,
        config: mlsMigration,
      },
      mls: {
        enabled: FeatureStatus.ENABLED,
        config: mls,
      },
    } as unknown as FeatureList;

    const supportedProtocols = await evaluateSelfSupportedProtocols({
      apiClient: mockedApiClient,
      core: mockCore,
      teamFeatureList,
    });
    expect(supportedProtocols).toEqual(expected);
  });
});
