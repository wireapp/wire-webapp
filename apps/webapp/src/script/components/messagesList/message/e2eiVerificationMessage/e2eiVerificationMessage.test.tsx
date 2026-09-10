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

import {render} from '@testing-library/react';
import {isNull} from '@sindresorhus/is';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {Maybe} from 'true-myth';

import en from 'I18n/en-US.json';
import {Conversation} from 'Repositories/entity/Conversation';
import {E2EIVerificationMessage as VerificationMessageEntity} from 'Repositories/entity/message/e2eiVerificationMessage';
import {User} from 'Repositories/entity/User';
import {Config} from 'src/script/Config';
import {E2EIVerificationMessageType} from 'src/script/message/e2eiVerificationMessageType';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {setStrings, translate} from 'Util/localizerUtil';

import {E2EIVerificationMessage} from './e2eiVerificationMessage';

import {withTheme, withThemeAndRootContext} from '../../../../auth/util/test/testUtil';
import {translateForTest} from 'Util/test/translateForTest';

const legacyRootProviderWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate}));
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
const e2eiVerificationSupportUrl = 'https://support.example/e2ei-verification';

function withTranslationStrings(
  strings: typeof en,
  testFunction: TranslationTestFunction,
): IsolatedTranslationTestFunction {
  return async function runTranslationTest(): Promise<void> {
    setStrings({en: strings});

    try {
      await testFunction();
    } finally {
      setStrings({en});
    }
  };
}

function withE2EIConfiguration(testFunction: TranslationTestFunction): IsolatedTranslationTestFunction {
  return async function runE2EIConfigurationTest(): Promise<void> {
    const originalConfig = Config.getConfig();
    const configWithTestValues = {
      ...originalConfig,
      URL: {
        ...originalConfig.URL,
        SUPPORT: {
          ...originalConfig.URL.SUPPORT,
          E2EI_VERIFICATION: e2eiVerificationSupportUrl,
        },
      },
    };
    const configSpy = jest.spyOn(Config, 'getConfig').mockReturnValue(configWithTestValues);

    try {
      await testFunction();
    } finally {
      configSpy.mockRestore();
    }
  };
}

function createVerificationMessage(
  partialVerificationMessage: Partial<VerificationMessageEntity>,
): VerificationMessageEntity {
  const verificationMessage: Partial<VerificationMessageEntity> = {
    ...partialVerificationMessage,
  };
  return verificationMessage as VerificationMessageEntity;
}

type CreateConversationOptions = {
  readonly participatingUser?: User;
  readonly selfUser?: User;
};

function createConversation(options: CreateConversationOptions = {}): Conversation {
  const {participatingUser, selfUser} = options;
  const conversation = new Conversation('', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);

  Maybe.of(participatingUser).inspect(participatingUser => {
    conversation.participating_user_ets([participatingUser]);
  });

  Maybe.of(selfUser).inspect(selfUser => {
    conversation.selfUser(selfUser);
  });

  return conversation;
}

function createUser(name: string): User {
  const user = new User('user1', '', translateForTest);
  user.name(name);
  return user;
}

function getVerificationMessageContent(container: HTMLElement): HTMLElement {
  const verificationMessageContent = container.querySelector<HTMLElement>(
    '[data-uie-name="element-message-verification"]',
  );

  if (isNull(verificationMessageContent)) {
    throw new Error('Expected E2EI verification message content to be rendered');
  }

  return verificationMessageContent;
}

function getLearnMoreLink(container: HTMLElement): HTMLAnchorElement {
  const learnMoreLink = container.querySelector<HTMLAnchorElement>('[data-uie-name="element-message-verification"] a');

  if (isNull(learnMoreLink)) {
    throw new Error('Expected an E2EI learn-more link to be rendered');
  }

  return learnMoreLink;
}

describe('E2EIVerificationMessage', () => {
  const conversation = new Conversation('', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);

  describe('with verified message', () => {
    it('shows verified icon when message is verified', async () => {
      const message = createVerificationMessage({
        messageType: E2EIVerificationMessageType.VERIFIED,
      });

      const {getByTestId} = render(
        withTheme(<E2EIVerificationMessage message={message} conversation={conversation} />),
      );

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(E2EIVerificationMessageType.VERIFIED);
    });

    it(
      'preserves the legacy HTML translation when rendering is disabled',
      withE2EIConfiguration(
        withTranslationStrings(en, () => {
          const message = createVerificationMessage({
            messageType: E2EIVerificationMessageType.VERIFIED,
          });

          const {container} = render(
            withThemeAndRootContext(
              <E2EIVerificationMessage message={message} conversation={createConversation()} />,
              legacyRootProviderWrapper,
            ),
          );

          expect(getLearnMoreLink(container)).toHaveTextContent('Learn more');
        }),
      ),
    );

    it(
      'renders the learn-more link as React when rendering is enabled',
      withE2EIConfiguration(
        withTranslationStrings(en, () => {
          const message = createVerificationMessage({
            messageType: E2EIVerificationMessageType.VERIFIED,
          });

          const {container} = render(
            withThemeAndRootContext(
              <E2EIVerificationMessage message={message} conversation={createConversation()} />,
              reactTranslationRenderingRootProviderWrapper,
            ),
          );

          const learnMoreLink = getLearnMoreLink(container);
          expect(learnMoreLink).toHaveTextContent('Learn more');
          expect(learnMoreLink).toHaveAttribute('href', e2eiVerificationSupportUrl);
          expect(learnMoreLink).toHaveAttribute('target', '_blank');
          expect(learnMoreLink).toHaveAttribute('rel', 'nofollow noopener noreferrer');
        }),
      ),
    );
  });

  describe('with degraded message', () => {
    const user = new User('user1', '', translateForTest);

    it('show new unverified device added', async () => {
      const message = createVerificationMessage({
        messageType: E2EIVerificationMessageType.NEW_DEVICE,
        userIds: [user.qualifiedId],
      });

      const {getByTestId} = render(
        withTheme(<E2EIVerificationMessage message={message} conversation={conversation} />),
      );

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(E2EIVerificationMessageType.NEW_DEVICE);
    });

    it('show new unverified user added', async () => {
      const message = createVerificationMessage({
        messageType: E2EIVerificationMessageType.NEW_MEMBER,
        userIds: [user.qualifiedId],
      });

      const {getByTestId} = render(
        withTheme(<E2EIVerificationMessage message={message} conversation={conversation} />),
      );

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(E2EIVerificationMessageType.NEW_MEMBER);
    });

    it('show certificate expired', async () => {
      const message = createVerificationMessage({
        messageType: E2EIVerificationMessageType.EXPIRED,
        userIds: [user.qualifiedId],
      });

      const {getByTestId} = render(
        withTheme(<E2EIVerificationMessage message={message} conversation={conversation} />),
      );

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(E2EIVerificationMessageType.EXPIRED);
    });

    it('show certificate revoked', async () => {
      const message = createVerificationMessage({
        messageType: E2EIVerificationMessageType.REVOKED,
        userIds: [user.qualifiedId],
      });

      const {getByTestId} = render(
        withTheme(<E2EIVerificationMessage message={message} conversation={conversation} />),
      );

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(E2EIVerificationMessageType.REVOKED);
    });

    it('show certificate no longer verified', async () => {
      const message = createVerificationMessage({
        messageType: E2EIVerificationMessageType.NO_LONGER_VERIFIED,
        userIds: [user.qualifiedId],
      });

      const {getByTestId} = render(
        withTheme(<E2EIVerificationMessage message={message} conversation={conversation} />),
      );

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(
        E2EIVerificationMessageType.NO_LONGER_VERIFIED,
      );
    });

    it.each([
      E2EIVerificationMessageType.EXPIRED,
      E2EIVerificationMessageType.NEW_DEVICE,
      E2EIVerificationMessageType.NEW_MEMBER,
    ])('renders the remote %s user name as React text when enabled', messageType => {
      return withE2EIConfiguration(
        withTranslationStrings(en, () => {
          const remoteUser = createUser('R&D <Test>');
          const message = createVerificationMessage({
            messageType,
            userIds: [remoteUser.qualifiedId],
          });

          const {container} = render(
            withThemeAndRootContext(
              <E2EIVerificationMessage
                message={message}
                conversation={createConversation({participatingUser: remoteUser})}
              />,
              reactTranslationRenderingRootProviderWrapper,
            ),
          );

          const verificationMessageContent = getVerificationMessageContent(container);
          expect(verificationMessageContent).toHaveTextContent('R&D <Test>');
          expect(verificationMessageContent.querySelector('test')).toBeNull();
          expect(verificationMessageContent.querySelector('strong')).toHaveTextContent('R&D <Test>');
        }),
      )();
    });

    it(
      'renders the remote revoked message with a React learn-more link',
      withE2EIConfiguration(
        withTranslationStrings(en, () => {
          const remoteUser = createUser('Alice');
          const message = createVerificationMessage({
            messageType: E2EIVerificationMessageType.REVOKED,
            userIds: [remoteUser.qualifiedId],
          });

          const {container} = render(
            withThemeAndRootContext(
              <E2EIVerificationMessage
                message={message}
                conversation={createConversation({participatingUser: remoteUser})}
              />,
              reactTranslationRenderingRootProviderWrapper,
            ),
          );

          const verificationMessageContent = getVerificationMessageContent(container);
          const learnMoreLink = getLearnMoreLink(container);
          expect(verificationMessageContent).toHaveTextContent('Alice');
          expect(verificationMessageContent.querySelector('strong')).toHaveTextContent('Alice');
          expect(learnMoreLink).toHaveTextContent('Learn more');
          expect(learnMoreLink).toHaveAttribute('href', e2eiVerificationSupportUrl);
        }),
      ),
    );

    it(
      'renders the self-user revoked message with a React learn-more link',
      withE2EIConfiguration(
        withTranslationStrings(en, () => {
          const selfUser = createUser('Alice');
          const message = createVerificationMessage({
            messageType: E2EIVerificationMessageType.REVOKED,
            userIds: [selfUser.qualifiedId],
          });

          const {container} = render(
            withThemeAndRootContext(
              <E2EIVerificationMessage message={message} conversation={createConversation({selfUser})} />,
              reactTranslationRenderingRootProviderWrapper,
            ),
          );

          expect(getLearnMoreLink(container)).toHaveTextContent('Learn more');
        }),
      ),
    );

    it(
      'renders the generic no-longer-verified message with a React learn-more link',
      withE2EIConfiguration(
        withTranslationStrings(en, () => {
          const message = createVerificationMessage({
            messageType: E2EIVerificationMessageType.NO_LONGER_VERIFIED,
          });

          const {container} = render(
            withThemeAndRootContext(
              <E2EIVerificationMessage message={message} conversation={createConversation()} />,
              reactTranslationRenderingRootProviderWrapper,
            ),
          );

          expect(getLearnMoreLink(container)).toHaveTextContent('Learn more');
        }),
      ),
    );

    it(
      'keeps a translation-looking remote user name literal',
      withTranslationStrings(en, () => {
        const remoteUser = createUser('[link]Alice[/link]');
        const message = createVerificationMessage({
          messageType: E2EIVerificationMessageType.EXPIRED,
          userIds: [remoteUser.qualifiedId],
        });

        const {container} = render(
          withThemeAndRootContext(
            <E2EIVerificationMessage
              message={message}
              conversation={createConversation({participatingUser: remoteUser})}
            />,
            reactTranslationRenderingRootProviderWrapper,
          ),
        );

        const verificationMessageContent = getVerificationMessageContent(container);
        expect(verificationMessageContent).toHaveTextContent('[link]Alice[/link]');
        expect(verificationMessageContent.querySelectorAll('a')).toHaveLength(0);
        expect(verificationMessageContent.querySelectorAll('strong')).toHaveLength(1);
      }),
    );

    it(
      'renders a moved remote user placeholder without formatting',
      withTranslationStrings(
        {
          ...en,
          'conversation.E2EICertificateExpired': 'Certificate expired for {user}.',
        },
        () => {
          const remoteUser = createUser('Alice');
          const message = createVerificationMessage({
            messageType: E2EIVerificationMessageType.EXPIRED,
            userIds: [remoteUser.qualifiedId],
          });

          const {container} = render(
            withThemeAndRootContext(
              <E2EIVerificationMessage
                message={message}
                conversation={createConversation({participatingUser: remoteUser})}
              />,
              reactTranslationRenderingRootProviderWrapper,
            ),
          );

          const verificationMessageContent = getVerificationMessageContent(container);
          expect(verificationMessageContent).toHaveTextContent('Certificate expired for Alice.');
          expect(verificationMessageContent.querySelectorAll('strong')).toHaveLength(0);
        },
      ),
    );

    it(
      'keeps unsupported translation markup as text',
      withTranslationStrings(
        {
          ...en,
          'conversation.E2EICertificateExpired': '<img src="example">Certificate expired for [bold]{user}[/bold].',
        },
        () => {
          const remoteUser = createUser('Alice');
          const message = createVerificationMessage({
            messageType: E2EIVerificationMessageType.EXPIRED,
            userIds: [remoteUser.qualifiedId],
          });

          const {container} = render(
            withThemeAndRootContext(
              <E2EIVerificationMessage
                message={message}
                conversation={createConversation({participatingUser: remoteUser})}
              />,
              reactTranslationRenderingRootProviderWrapper,
            ),
          );

          const verificationMessageContent = getVerificationMessageContent(container);
          expect(verificationMessageContent).toHaveTextContent('<img src="example">Certificate expired for Alice.');
          expect(verificationMessageContent.querySelector('img')).toBeNull();
        },
      ),
    );
  });
});
