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

import {act, render, waitFor} from '@testing-library/react';
import {ClientClassification} from '@wireapp/api-client/lib/client/';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';

import en from 'I18n/en-US.json';
import si from 'I18n/si-LK.json';
import {ClientEntity} from 'Repositories/client/ClientEntity';
import {useLegalHoldModalState} from 'Components/Modals/LegalHoldModal/LegalHoldModal.state';
import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {ClientRepository} from 'Repositories/client';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {CryptographyRepository} from 'Repositories/cryptography/CryptographyRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {SearchRepository} from 'Repositories/search/searchRepository';
import {TeamRepository} from 'Repositories/team/TeamRepository';
import {UserRepository} from 'Repositories/user/userRepository';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {translateForTest} from 'Util/test/translateForTest';
import {setStrings, translate} from 'Util/localizerUtil';
import {splitFingerprint} from 'Util/stringUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {LegalHoldModal, LegalHoldModalProps, LegalHoldModalType} from './LegalHoldModal';

import {TestFactory} from '../../../../../test/helper/TestFactory';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

const userRepository = {} as UserRepository;
const testFactory = new TestFactory();
let callRepository: CallingRepository;
const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);
const legacyTranslationRootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate}),
);
const reactTranslationRenderingRootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({
    isFeatureToggleEnabled(featureName) {
      return featureName === reactTranslationRenderingFeatureToggleName;
    },
    translate,
  }),
);

type TranslationTestFunction = () => void | Promise<void>;
type IsolatedTranslationTestFunction = () => Promise<void>;

function withTranslationStrings(
  strings: typeof en,
  testFunction: TranslationTestFunction,
): IsolatedTranslationTestFunction {
  return async function runTranslationTest(): Promise<void> {
    setStrings({en: strings});

    try {
      await testFunction();
    } finally {
      act((): void => {
        useLegalHoldModalState.getState().closeModal();
      });
      setStrings({en});
    }
  };
}

function createLegalHoldUser(): User {
  const legalHoldUser = new User('legal-hold-user', '', translateForTest);
  const legalHoldClient = new ClientEntity(false, null, 'legal-hold-client');
  legalHoldClient.class = ClientClassification.LEGAL_HOLD;
  legalHoldUser.devices([legalHoldClient]);

  return legalHoldUser;
}

function createOthersDescriptionProps(): LegalHoldModalProps {
  const props = defaultProps();
  props.conversationRepository = {
    getAllUsersInConversation: function getAllUsersInConversation(): Promise<User[]> {
      return Promise.resolve([createLegalHoldUser()]);
    },
  } as unknown as ConversationRepository;

  return props;
}

beforeAll(() => {
  testFactory.exposeCallingActors().then(injectedCallingRepository => {
    callRepository = injectedCallingRepository;
    return callRepository;
  });
});

const defaultProps = () => ({
  clientRepository: {} as ClientRepository,
  conversationRepository: {
    getAllUsersInConversation: (conversationId: QualifiedId): Promise<User[]> => Promise.resolve([]),
  } as ConversationRepository,
  cryptographyRepository: new CryptographyRepository({} as any),
  messageRepository: {
    updateAllClients: (conversation: Conversation, blockSystemMessage: boolean): Promise<void> => Promise.resolve(),
  } as MessageRepository,
  searchRepository: new SearchRepository(userRepository),
  teamRepository: {
    isSelfConnectedTo: function isSelfConnectedTo(): boolean {
      return false;
    },
  } as unknown as TeamRepository,
  selfUser: new User('mocked-id', '', translateForTest),
});

describe('LegalHoldModal', () => {
  it('is showRequestModal', (): void => {
    try {
      render(<LegalHoldModal {...defaultProps()} />, {wrapper: rootProviderWrapper});
      act((): void => {
        useLegalHoldModalState.getState().showRequestModal();
      });

      expect(useLegalHoldModalState.getState().type).toBe(LegalHoldModalType.REQUEST);
    } finally {
      act((): void => {
        useLegalHoldModalState.getState().closeModal();
      });
    }
  });

  it('is showUser', async (): Promise<void> => {
    try {
      const props = defaultProps();
      await render(<LegalHoldModal {...props} />, {wrapper: rootProviderWrapper});
      const selfConversation = new Conversation(props.selfUser.id, '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);

      await act(async (): Promise<void> => {
        useLegalHoldModalState.getState().showUsers(false, selfConversation);
      });

      expect(useLegalHoldModalState.getState().type).toBe(LegalHoldModalType.USERS);
    } finally {
      act((): void => {
        useLegalHoldModalState.getState().closeModal();
      });
    }
  });

  it(
    'preserves request rendering when React translation rendering is disabled',
    withTranslationStrings({...en, legalHoldModalText: 'Before[br][fingerprint]After'}, async (): Promise<void> => {
      const fingerprint = 'A1B2';
      const expectedFingerprintRepresentation = splitFingerprint(fingerprint)
        .map(fingerprintPart => {
          return `${fingerprintPart} `;
        })
        .join('');
      const {getByTestId} = render(<LegalHoldModal {...defaultProps()} />, {
        wrapper: legacyTranslationRootProviderWrapper,
      });

      act((): void => {
        useLegalHoldModalState.getState().showRequestModal(false, false, fingerprint);
      });

      const statusText = await waitFor((): HTMLElement => {
        return getByTestId('status-modal-text');
      });

      expect(statusText.querySelectorAll('br')).toHaveLength(1);
      expect(statusText.querySelectorAll('.legal-hold-modal__fingerprint')).toHaveLength(1);
      expect(statusText.querySelector('.legal-hold-modal__fingerprint')?.textContent).toBe(
        expectedFingerprintRepresentation,
      );
    }),
  );

  it(
    'renders request markers as React nodes when enabled',
    withTranslationStrings(en, async (): Promise<void> => {
      const fingerprint = 'A1B2C3D4';
      const expectedFingerprintParts = splitFingerprint(fingerprint);
      const expectedFingerprintRepresentation = expectedFingerprintParts
        .map(fingerprintPart => {
          return `${fingerprintPart} `;
        })
        .join('');
      const {getByTestId} = render(<LegalHoldModal {...defaultProps()} />, {
        wrapper: reactTranslationRenderingRootProviderWrapper,
      });

      act((): void => {
        useLegalHoldModalState.getState().showRequestModal(false, false, fingerprint);
      });

      const statusText = await waitFor((): HTMLElement => {
        return getByTestId('status-modal-text');
      });
      const fingerprintElement = statusText.querySelector('.legal-hold-modal__fingerprint');

      expect(statusText.querySelectorAll('br')).toHaveLength(2);
      expect(statusText.querySelectorAll('.legal-hold-modal__fingerprint')).toHaveLength(1);
      expect(fingerprintElement).toHaveClass('legal-hold-modal__fingerprint');
      expect(fingerprintElement).toHaveAttribute('data-uie-name', 'status-modal-fingerprint');
      expect(fingerprintElement?.textContent).toBe(expectedFingerprintRepresentation);

      const fingerprintPartElements = fingerprintElement?.querySelectorAll('span');
      expect(fingerprintPartElements).toHaveLength(expectedFingerprintParts.length);
      expectedFingerprintParts.forEach((fingerprintPart, fingerprintPartIndex) => {
        expect(fingerprintPartElements?.[fingerprintPartIndex]?.textContent).toBe(`${fingerprintPart} `);
      });
    }),
  );

  it(
    'preserves fingerprint presentation between legacy and React rendering',
    withTranslationStrings({...en, legalHoldModalText: 'Before[br][fingerprint]After'}, async (): Promise<void> => {
      const fingerprint = 'A1B2C3D4E5F6G7H8';
      const expectedFingerprintRepresentation = splitFingerprint(fingerprint)
        .map(fingerprintPart => {
          return `${fingerprintPart} `;
        })
        .join('');

      const legacyRender = render(<LegalHoldModal {...defaultProps()} />, {
        wrapper: legacyTranslationRootProviderWrapper,
      });
      act((): void => {
        useLegalHoldModalState.getState().showRequestModal(false, false, fingerprint);
      });
      const legacyStatusText = await waitFor((): HTMLElement => {
        return legacyRender.getByTestId('status-modal-text');
      });
      const legacyFingerprintRepresentation = legacyStatusText.querySelector(
        '.legal-hold-modal__fingerprint',
      )?.textContent;

      legacyRender.unmount();
      act((): void => {
        useLegalHoldModalState.getState().closeModal();
      });

      const reactRender = render(<LegalHoldModal {...defaultProps()} />, {
        wrapper: reactTranslationRenderingRootProviderWrapper,
      });
      act((): void => {
        useLegalHoldModalState.getState().showRequestModal(false, false, fingerprint);
      });
      const reactStatusText = await waitFor((): HTMLElement => {
        return reactRender.getByTestId('status-modal-text');
      });
      const reactFingerprintElement = reactStatusText.querySelector('.legal-hold-modal__fingerprint');
      const reactFingerprintRepresentation = reactFingerprintElement?.textContent;

      expect(legacyFingerprintRepresentation).toBe(expectedFingerprintRepresentation);
      expect(reactFingerprintRepresentation).toBe(legacyFingerprintRepresentation);
      expect(reactFingerprintElement?.querySelectorAll('span')).toHaveLength(splitFingerprint(fingerprint).length);

      reactRender.unmount();
    }),
  );

  it(
    'keeps HTML-looking fingerprint text opaque in the React request rendering',
    withTranslationStrings(en, async (): Promise<void> => {
      const htmlLookingFingerprint = 'AB<CD>&EF';
      const expectedFingerprintRepresentation = splitFingerprint(htmlLookingFingerprint)
        .map(fingerprintPart => {
          return `${fingerprintPart} `;
        })
        .join('');
      const {getByTestId} = render(<LegalHoldModal {...defaultProps()} />, {
        wrapper: reactTranslationRenderingRootProviderWrapper,
      });

      act((): void => {
        useLegalHoldModalState.getState().showRequestModal(false, false, htmlLookingFingerprint);
      });

      const statusText = await waitFor((): HTMLElement => {
        return getByTestId('status-modal-text');
      });
      const fingerprintElement = statusText.querySelector('.legal-hold-modal__fingerprint');

      expect(fingerprintElement?.textContent).toBe(expectedFingerprintRepresentation);
      expect(fingerprintElement?.querySelector('cd')).toBeNull();
      expect(statusText.querySelector('img')).toBeNull();
    }),
  );

  it(
    'keeps translation-looking fingerprint text opaque in the React request rendering',
    withTranslationStrings(en, async (): Promise<void> => {
      const translationLookingFingerprint = '[link]fingerprint[/link]';
      const expectedFingerprintRepresentation = splitFingerprint(translationLookingFingerprint)
        .map(fingerprintPart => {
          return `${fingerprintPart} `;
        })
        .join('');
      const {getByTestId} = render(<LegalHoldModal {...defaultProps()} />, {
        wrapper: reactTranslationRenderingRootProviderWrapper,
      });

      act((): void => {
        useLegalHoldModalState.getState().showRequestModal(false, false, translationLookingFingerprint);
      });

      const statusText = await waitFor((): HTMLElement => {
        return getByTestId('status-modal-text');
      });
      const fingerprintElement = statusText.querySelector('.legal-hold-modal__fingerprint');

      expect(fingerprintElement?.textContent).toBe(expectedFingerprintRepresentation);
      expect(fingerprintElement?.querySelector('a')).toBeNull();
    }),
  );

  it(
    'keeps request marker placement under translation control',
    withTranslationStrings(
      {...en, legalHoldModalText: '[fingerprint][br]is the recording-device fingerprint.'},
      async (): Promise<void> => {
        const fingerprint = 'A1B2';
        const expectedFingerprintRepresentation = splitFingerprint(fingerprint)
          .map(fingerprintPart => {
            return `${fingerprintPart} `;
          })
          .join('');
        const {getByTestId} = render(<LegalHoldModal {...defaultProps()} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });

        act((): void => {
          useLegalHoldModalState.getState().showRequestModal(false, false, fingerprint);
        });

        const statusText = await waitFor((): HTMLElement => {
          return getByTestId('status-modal-text');
        });
        const requestParagraph = statusText.querySelector('p');

        expect(requestParagraph?.firstElementChild).toHaveClass('legal-hold-modal__fingerprint');
        expect(requestParagraph?.querySelector('br')).toBeInTheDocument();
        expect(requestParagraph?.textContent).toBe(
          `${expectedFingerprintRepresentation}is the recording-device fingerprint.`,
        );
      },
    ),
  );

  it(
    'leaves unsupported request markup as text',
    withTranslationStrings(
      {...en, legalHoldModalText: 'Before<img src="example">[br]After'},
      async (): Promise<void> => {
        const {getByTestId} = render(<LegalHoldModal {...defaultProps()} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });

        act((): void => {
          useLegalHoldModalState.getState().showRequestModal(false, false, 'A1B2');
        });

        const statusText = await waitFor((): HTMLElement => {
          return getByTestId('status-modal-text');
        });

        expect(statusText).toHaveTextContent('Before<img src="example">After');
        expect(statusText.querySelector('img')).toBeNull();
      },
    ),
  );

  it('keeps the Sinhala fingerprint marker in the translation protocol', (): void => {
    expect(si.legalHoldModalText).toContain('[fingerprint]');
    expect(si.legalHoldModalText).not.toContain('[ඇඟිලි සටහන]');
  });

  it(
    'preserves both Legal Hold descriptions in the legacy HTML path',
    withTranslationStrings(
      {
        ...en,
        legalHoldDescriptionSelf: 'Self before<br />Self after',
        legalHoldDescriptionOthers: 'Others before<br />Others after',
      },
      async (): Promise<void> => {
        const selfRender = render(<LegalHoldModal {...defaultProps()} />, {
          wrapper: legacyTranslationRootProviderWrapper,
        });
        act((): void => {
          useLegalHoldModalState.getState().showUsers(false);
        });
        const selfDescription = await waitFor((): HTMLElement => {
          return selfRender.getByTestId('status-modal-text');
        });

        expect(selfDescription).toHaveTextContent('Self beforeSelf after');
        expect(selfDescription.querySelectorAll('br')).toHaveLength(1);
        selfRender.unmount();
        act((): void => {
          useLegalHoldModalState.getState().closeModal();
        });

        const othersRender = render(<LegalHoldModal {...createOthersDescriptionProps()} />, {
          wrapper: legacyTranslationRootProviderWrapper,
        });
        act((): void => {
          useLegalHoldModalState
            .getState()
            .showUsers(false, new Conversation('conversation-id', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest));
        });
        const othersDescription = await waitFor((): HTMLElement => {
          return othersRender.getByTestId('status-modal-text');
        });

        expect(othersDescription).toHaveTextContent('Others beforeOthers after');
        expect(othersDescription.querySelectorAll('br')).toHaveLength(1);
      },
    ),
  );

  it(
    'renders both Legal Hold descriptions with exact React line-break compatibility',
    withTranslationStrings(
      {
        ...en,
        legalHoldDescriptionSelf: 'Self before<br />Self after',
        legalHoldDescriptionOthers: 'Others before<br />Others after',
      },
      async (): Promise<void> => {
        const selfRender = render(<LegalHoldModal {...defaultProps()} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        act((): void => {
          useLegalHoldModalState.getState().showUsers(false);
        });
        const selfDescription = await waitFor((): HTMLElement => {
          return selfRender.getByTestId('status-modal-text');
        });

        expect(selfDescription).toHaveTextContent('Self beforeSelf after');
        expect(selfDescription.querySelectorAll('br')).toHaveLength(1);
        selfRender.unmount();
        act((): void => {
          useLegalHoldModalState.getState().closeModal();
        });

        const othersRender = render(<LegalHoldModal {...createOthersDescriptionProps()} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        act((): void => {
          useLegalHoldModalState
            .getState()
            .showUsers(false, new Conversation('conversation-id', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest));
        });
        const othersDescription = await waitFor((): HTMLElement => {
          return othersRender.getByTestId('status-modal-text');
        });

        expect(othersDescription).toHaveTextContent('Others beforeOthers after');
        expect(othersDescription.querySelectorAll('br')).toHaveLength(1);
      },
    ),
  );

  it(
    'leaves unsupported Legal Hold description markup and newlines as text',
    withTranslationStrings(
      {
        ...en,
        legalHoldDescriptionSelf: 'Before<img src="example">\n\nAfter',
      },
      async (): Promise<void> => {
        const {getByTestId} = render(<LegalHoldModal {...defaultProps()} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        act((): void => {
          useLegalHoldModalState.getState().showUsers(false);
        });
        const description = await waitFor((): HTMLElement => {
          return getByTestId('status-modal-text');
        });

        expect(description.textContent).toBe('Before<img src="example">\n\nAfter');
        expect(description.querySelector('img')).toBeNull();
        expect(description.querySelector('br')).toBeNull();
      },
    ),
  );
});
