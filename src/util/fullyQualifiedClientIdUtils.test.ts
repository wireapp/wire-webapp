/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {ClientClassification, QualifiedUserClientMap} from '@wireapp/api-client/lib/client';

import {
  mapQualifiedUserClientIdsToFullyQualifiedClientIds,
  constructFullyQualifiedClientId,
  parseFullQualifiedClientId,
} from './fullyQualifiedClientIdUtils';

enum MOCKED_DOMAINS {
  DOMAIN1 = 'domain1.example.com',
  DOMAIN2 = 'domain2.example.com',
}

enum MOCKED_USER_IDS {
  USER1 = '000600d0-000b-9c1a-000d-a4130002c221',
  USER2 = '000600d0-000b-9c1a-000d-a4130002c222',
}

enum MOCKED_CLIENT_IDS {
  CLIENT1 = '4130002c221',
  CLIENT2 = '4130002c222',
  CLIENT3 = '4130002c223',
}

describe('constructFullyQualifiedClientId', () => {
  it('construct fullyQualifiedClientId client id', () => {
    expect(
      constructFullyQualifiedClientId(MOCKED_USER_IDS.USER1, MOCKED_CLIENT_IDS.CLIENT1, MOCKED_DOMAINS.DOMAIN1),
    ).toEqual(`${MOCKED_USER_IDS.USER1}:${MOCKED_CLIENT_IDS.CLIENT1}@${MOCKED_DOMAINS.DOMAIN1}`);
  });
});

describe('parseFullQualifiedClientId', () => {
  it('parses a client id correctly', () => {
    const qualifiedClientId = constructFullyQualifiedClientId(
      MOCKED_USER_IDS.USER1,
      MOCKED_CLIENT_IDS.CLIENT1,
      MOCKED_DOMAINS.DOMAIN1,
    );

    const {user, client, domain} = parseFullQualifiedClientId(qualifiedClientId);
    expect(user).toEqual(MOCKED_USER_IDS.USER1);
    expect(client).toEqual(MOCKED_CLIENT_IDS.CLIENT1);
    expect(domain).toEqual(MOCKED_DOMAINS.DOMAIN1);
  });

  it('throws an error when a wrong id is given', () => {
    expect(() => parseFullQualifiedClientId('')).toThrow();
    expect(() => parseFullQualifiedClientId('userid:clientid:domain')).toThrow();
  });
});

describe('mapQualifiedUserClientIdsToFullyQualifiedClientIds', () => {
  it('simple map', () => {
    const qualified_user_map3: QualifiedUserClientMap = {
      [MOCKED_DOMAINS.DOMAIN1]: {
        [MOCKED_USER_IDS.USER1]: [
          {
            class: ClientClassification.LEGAL_HOLD,
            id: MOCKED_CLIENT_IDS.CLIENT1,
          },
        ],
      },
    };

    const expectedResult = [`${MOCKED_USER_IDS.USER1}:${MOCKED_CLIENT_IDS.CLIENT1}@${MOCKED_DOMAINS.DOMAIN1}`];

    const result = mapQualifiedUserClientIdsToFullyQualifiedClientIds(qualified_user_map3);

    expect(result).toEqual(expectedResult);
  });

  it('extended map - 1 user', () => {
    const qualified_user_map3: QualifiedUserClientMap = {
      [MOCKED_DOMAINS.DOMAIN1]: {
        [MOCKED_USER_IDS.USER1]: [
          {
            class: ClientClassification.LEGAL_HOLD,
            id: MOCKED_CLIENT_IDS.CLIENT1,
          },
        ],
      },
      [MOCKED_DOMAINS.DOMAIN2]: {
        [MOCKED_USER_IDS.USER1]: [
          {
            class: ClientClassification.LEGAL_HOLD,
            id: MOCKED_CLIENT_IDS.CLIENT2,
          },
          {
            class: ClientClassification.LEGAL_HOLD,
            id: MOCKED_CLIENT_IDS.CLIENT3,
          },
        ],
      },
    };

    const expectedResult = [
      `${MOCKED_USER_IDS.USER1}:${MOCKED_CLIENT_IDS.CLIENT1}@${MOCKED_DOMAINS.DOMAIN1}`,
      `${MOCKED_USER_IDS.USER1}:${MOCKED_CLIENT_IDS.CLIENT2}@${MOCKED_DOMAINS.DOMAIN2}`,
      `${MOCKED_USER_IDS.USER1}:${MOCKED_CLIENT_IDS.CLIENT3}@${MOCKED_DOMAINS.DOMAIN2}`,
    ];

    const result = mapQualifiedUserClientIdsToFullyQualifiedClientIds(qualified_user_map3);

    expect(result).toEqual(expectedResult);
  });

  it('extended map - 2 users', () => {
    const qualified_user_map3: QualifiedUserClientMap = {
      [MOCKED_DOMAINS.DOMAIN1]: {
        [MOCKED_USER_IDS.USER1]: [
          {
            class: ClientClassification.LEGAL_HOLD,
            id: MOCKED_CLIENT_IDS.CLIENT1,
          },
        ],
        [MOCKED_USER_IDS.USER2]: [
          {
            class: ClientClassification.LEGAL_HOLD,
            id: MOCKED_CLIENT_IDS.CLIENT2,
          },
        ],
      },
      [MOCKED_DOMAINS.DOMAIN2]: {
        [MOCKED_USER_IDS.USER1]: [
          {
            class: ClientClassification.LEGAL_HOLD,
            id: MOCKED_CLIENT_IDS.CLIENT2,
          },
          {
            class: ClientClassification.LEGAL_HOLD,
            id: MOCKED_CLIENT_IDS.CLIENT3,
          },
        ],
        [MOCKED_USER_IDS.USER2]: [
          {
            class: ClientClassification.LEGAL_HOLD,
            id: MOCKED_CLIENT_IDS.CLIENT2,
          },
        ],
      },
    };

    const expectedResult = [
      `${MOCKED_USER_IDS.USER1}:${MOCKED_CLIENT_IDS.CLIENT1}@${MOCKED_DOMAINS.DOMAIN1}`,
      `${MOCKED_USER_IDS.USER2}:${MOCKED_CLIENT_IDS.CLIENT2}@${MOCKED_DOMAINS.DOMAIN1}`,
      `${MOCKED_USER_IDS.USER1}:${MOCKED_CLIENT_IDS.CLIENT2}@${MOCKED_DOMAINS.DOMAIN2}`,
      `${MOCKED_USER_IDS.USER1}:${MOCKED_CLIENT_IDS.CLIENT3}@${MOCKED_DOMAINS.DOMAIN2}`,
      `${MOCKED_USER_IDS.USER2}:${MOCKED_CLIENT_IDS.CLIENT2}@${MOCKED_DOMAINS.DOMAIN2}`,
    ];

    const result = mapQualifiedUserClientIdsToFullyQualifiedClientIds(qualified_user_map3);

    expect(result).toEqual(expectedResult);
  });
});
