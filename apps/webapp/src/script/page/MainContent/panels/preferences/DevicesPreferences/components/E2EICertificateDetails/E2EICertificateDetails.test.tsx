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

import {render, waitFor} from '@testing-library/react';
import {CONVERSATION_TYPE, MLSConversation} from '@wireapp/api-client/lib/conversation';
import {CredentialType} from '@wireapp/core/lib/messagingProtocols/mls';
import {User} from 'Repositories/entity/User';
import {UserState} from 'Repositories/user/UserState';
import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {E2EIHandler, MLSStatuses, WireIdentity} from 'src/script/E2EIdentity';
import {Core} from 'src/script/service/CoreSingleton';
import {generateAPIConversation} from 'test/helper/ConversationGenerator';
import {container} from 'tsyringe';

import {E2EICertificateDetails} from './E2EICertificateDetails';

const generateIdentity = (status: MLSStatuses, credentialType = CredentialType.X509): WireIdentity => ({
  status,
  x509Identity: {
    free: jest.fn(),
    certificate: 'certificate',
    displayName: '',
    domain: '',
    handle: '',
    notAfter: BigInt(0),
    notBefore: BigInt(0),
    serialNumber: '',
    [Symbol.dispose]: () => {},
  },
  credentialType,
  deviceId: '',
  clientId: '',
  thumbprint: '',
  qualifiedUserId: {
    domain: '',
    id: '',
  },
});

const core = container.resolve(Core);

describe('E2EICertificateDetails', () => {
  beforeAll(async () => {
    jest.spyOn(core.service?.conversation!, 'getMLSSelfConversation').mockResolvedValue(
      generateAPIConversation({
        id: {id: 'id', domain: 'domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        overwites: {group_id: 'groupId'},
      }) as MLSConversation,
    );

    const selfUser = new User('id', 'domain');
    container.resolve(UserState).self(selfUser);

    const handler = E2EIHandler.getInstance();
    await handler.initialize({discoveryUrl: '', gracePeriodInSeconds: 100});
  });

  describe('idicates the state of the e2ei identity', () => {
    it('is e2ei identity not downloaded', async () => {
      const {getByTestId} = render(withTheme(<E2EICertificateDetails />));

      const E2EIdentityStatus = getByTestId('e2ei-identity-status');
      expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.NOT_ACTIVATED);
    });

    it('is e2ei identity not downloaded for basic MLS device', async () => {
      const identity = generateIdentity(MLSStatuses.VALID, CredentialType.Basic);

      const {getByTestId} = render(withTheme(<E2EICertificateDetails identity={identity} />));

      const E2EIdentityStatus = getByTestId('e2ei-identity-status');
      expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.NOT_ACTIVATED);
    });

    it('is e2ei identity expired', async () => {
      const identity = generateIdentity(MLSStatuses.EXPIRED);

      const {getByTestId} = render(withTheme(<E2EICertificateDetails identity={identity} />));

      const E2EIdentityStatus = getByTestId('e2ei-identity-status');
      expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.EXPIRED);
    });

    it('is e2ei identity revoked', async () => {
      const identity = generateIdentity(MLSStatuses.REVOKED);

      const {getByTestId} = render(withTheme(<E2EICertificateDetails identity={identity} />));

      const E2EIdentityStatus = getByTestId('e2ei-identity-status');
      expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.REVOKED);
    });

    it('is e2ei identity verified', async () => {
      const identity = generateIdentity(MLSStatuses.VALID);

      const {getByTestId} = render(withTheme(<E2EICertificateDetails identity={identity} />));

      const E2EIdentityStatus = getByTestId('e2ei-identity-status');
      expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.VALID);
    });
  });

  describe('shows the update certificate button for the current device', () => {
    it('for expired certificate', async () => {
      const identity = generateIdentity(MLSStatuses.EXPIRED);

      const {getByText} = render(withTheme(<E2EICertificateDetails identity={identity} isCurrentDevice />));

      await waitFor(() => {
        const E2EIdentityStatus = getByText('E2EI.updateCertificate');
        expect(E2EIdentityStatus).toBeDefined();
      });
    });

    it('for certificate that expires soon', async () => {
      const identity = generateIdentity(MLSStatuses.VALID);

      const instance = E2EIHandler.getInstance();
      jest.spyOn(instance, 'hasGracePeriodStartedForSelfClient').mockResolvedValue(true);

      const {getByText} = render(withTheme(<E2EICertificateDetails identity={identity} isCurrentDevice />));

      await waitFor(() => {
        const E2EIdentityStatus = getByText('E2EI.updateCertificate');
        expect(E2EIdentityStatus).toBeDefined();
      });
    });

    it('for not downloaded certificate', async () => {
      const identity = generateIdentity(MLSStatuses.NOT_ACTIVATED);

      const {getByText} = render(withTheme(<E2EICertificateDetails identity={identity} isCurrentDevice />));

      const E2EIdentityStatus = getByText('E2EI.getCertificate');
      expect(E2EIdentityStatus).toBeDefined();
    });
  });
});
