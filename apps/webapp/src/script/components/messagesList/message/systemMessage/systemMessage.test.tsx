/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {render, screen} from '@testing-library/react';

import {isNull} from '@sindresorhus/is';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import en from 'I18n/en-US.json';
import {Conversation} from 'Repositories/entity/Conversation';
import {DeleteConversationMessage} from 'Repositories/entity/message/deleteConversationMessage';
import {MemberRoleUpdateMessage} from 'Repositories/entity/message/memberRoleUpdateMessage';
import {MessageTimerUpdateMessage} from 'Repositories/entity/message/messageTimerUpdateMessage';
import {ReceiptModeUpdateMessage} from 'Repositories/entity/message/receiptModeUpdateMessage';
import {RenameMessage} from 'Repositories/entity/message/renameMessage';
import {SystemMessage as SystemMessageEntity} from 'Repositories/entity/message/systemMessage';
import {User} from 'Repositories/entity/User';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {setStrings, translate} from 'Util/localizerUtil';
import {translateForTest} from 'Util/test/translateForTest';

import {SystemMessage} from './systemMessage';
import {withTheme, withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';

jest.mock('Components/icon', () => ({
  EditIcon: () => {
    return <span data-uie-name="editicon" className="editicon"></span>;
  },
  ReadIcon: () => {
    return <span data-uie-name="readicon" className="readicon"></span>;
  },
  TimerIcon: () => {
    return <span data-uie-name="timericon" className="timericon"></span>;
  },
  __esModule: true,
}));

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
      setStrings({en});
    }
  };
}

function createDeleteConversationMessage(conversationName: string): DeleteConversationMessage {
  const conversation = new Conversation('', '', CONVERSATION_PROTOCOL.PROTEUS, translate);
  conversation.name(conversationName);
  return new DeleteConversationMessage(conversation, translate);
}

function getSystemMessageCaption(container: HTMLElement): HTMLElement {
  const caption = container.querySelector<HTMLElement>('.system-message-caption');

  if (isNull(caption)) {
    throw new Error('Expected a system message caption to be rendered');
  }

  return caption;
}

describe('SystemMessage', () => {
  it('shows edit icon for RenameMessage', async () => {
    const message = new RenameMessage('new name', undefined, undefined, translateForTest);

    render(withTheme(<SystemMessage message={message} />));

    expect(screen.queryByTestId('element-message-system')).not.toBeNull();
    expect(screen.queryByTestId('editicon')).not.toBeNull();
  });

  it('shows timer icon for MessageTimerUpdateMessage', async () => {
    const message = new MessageTimerUpdateMessage(0, translateForTest);

    render(withTheme(<SystemMessage message={message} />));

    expect(screen.queryByTestId('element-message-system')).not.toBeNull();
    expect(screen.queryByTestId('timericon')).not.toBeNull();
  });

  it('shows info icon and promotion caption for MemberRoleUpdateMessage', async () => {
    const message = new MemberRoleUpdateMessage(translateForTest);

    render(withTheme(<SystemMessage message={message} />));

    expect(screen.queryByTestId('element-message-system')).not.toBeNull();
  });

  it('shows read icon for ReceiptModeUpdateMessage', async () => {
    const message = new ReceiptModeUpdateMessage(true, translateForTest);

    render(withTheme(<SystemMessage message={message} />));

    expect(screen.queryByTestId('element-message-system')).not.toBeNull();
    expect(screen.queryByTestId('readicon')).not.toBeNull();
  });

  it(
    'preserves the legacy HTML caption when React translation rendering is disabled',
    withTranslationStrings(en, () => {
      const message = new MemberRoleUpdateMessage(translate);

      const {container} = render(
        withThemeAndRootContext(
          <SystemMessage message={message} />,
          createRootProviderWrapperForTest(createRootContextValueForTest({translate})),
        ),
      );
      const caption = getSystemMessageCaption(container);

      expect(caption).toHaveTextContent('You were promoted to group admin');
      expect(caption.querySelectorAll('strong')).toHaveLength(1);
      expect(container.querySelector('[data-uie-name="element-message-system"]')).not.toBeNull();
    }),
  );

  it(
    'renders bold translation formatting with React when enabled',
    withTranslationStrings(en, () => {
      const message = new MemberRoleUpdateMessage(translate);

      const {container} = render(
        withThemeAndRootContext(<SystemMessage message={message} />, reactTranslationRenderingRootProviderWrapper),
      );
      const caption = getSystemMessageCaption(container);

      expect(caption).toHaveTextContent('You were promoted to group admin');
      expect(caption.querySelectorAll('strong')).toHaveLength(1);
      expect(caption.querySelector('strong')).toHaveTextContent('You');
      expect(container.querySelector('[data-uie-name="element-message-system"]')).not.toBeNull();
      expect(caption.className).toBe('system-message-caption ellipsis');
    }),
  );

  it(
    'keeps unsupported caption markup as text when enabled',
    withTranslationStrings(
      {
        ...en,
        conversationYouPromotedToAdmin: '<img src="example">System update',
      },
      () => {
        const message = new MemberRoleUpdateMessage(translate);

        const {container} = render(
          withThemeAndRootContext(<SystemMessage message={message} />, reactTranslationRenderingRootProviderWrapper),
        );
        const caption = getSystemMessageCaption(container);

        expect(caption).toHaveTextContent('<img src="example">System update');
        expect(caption.querySelector('img')).toBeNull();
      },
    ),
  );

  it(
    'renders a named delete caption with an opaque runtime conversation name when enabled',
    withTranslationStrings(
      {
        ...en,
        notificationConversationDeletedNamed: 'Removed conversation: {name}',
      },
      () => {
        const message = createDeleteConversationMessage('R&D <Test>');

        const {container} = render(
          withThemeAndRootContext(<SystemMessage message={message} />, reactTranslationRenderingRootProviderWrapper),
        );
        const caption = getSystemMessageCaption(container);

        expect(caption).toHaveTextContent('Removed conversation: R&D <Test>');
        expect(caption.querySelector('test')).toBeNull();
        expect(caption.textContent).not.toContain('&amp;');
      },
    ),
  );

  it(
    'keeps translation-looking conversation names literal when enabled',
    withTranslationStrings(
      {
        ...en,
        notificationConversationDeletedNamed: 'Removed conversation: {name}',
      },
      () => {
        const message = createDeleteConversationMessage('[link]Conversation[/link]');

        const {container} = render(
          withThemeAndRootContext(<SystemMessage message={message} />, reactTranslationRenderingRootProviderWrapper),
        );
        const caption = getSystemMessageCaption(container);

        expect(caption).toHaveTextContent('Removed conversation: [link]Conversation[/link]');
        expect(caption.querySelector('a')).toBeNull();
      },
    ),
  );

  it(
    'preserves the named delete caption in the legacy path',
    withTranslationStrings(en, () => {
      const message = createDeleteConversationMessage('R&D <Test>');

      const {container} = render(
        withThemeAndRootContext(
          <SystemMessage message={message} />,
          createRootProviderWrapperForTest(createRootContextValueForTest({translate})),
        ),
      );
      const caption = getSystemMessageCaption(container);

      expect(caption).toHaveTextContent('R&D <Test> has been deleted');
      expect(caption.querySelector('test')).toBeNull();
    }),
  );

  it(
    'renders the timer runtime value as opaque text and preserves its translated placement',
    withTranslationStrings(
      {
        ...en,
        conversationUpdatedTimer: 'Timer set to {time}.',
      },
      () => {
        const message = new MessageTimerUpdateMessage(1000, translate);

        const {container} = render(
          withThemeAndRootContext(<SystemMessage message={message} />, reactTranslationRenderingRootProviderWrapper),
        );
        const caption = getSystemMessageCaption(container);

        expect(caption).toHaveTextContent('Timer set to 1 second.');
        expect(caption.querySelector('second')).toBeNull();
      },
    ),
  );

  it(
    'renders the reset timer caption without runtime substitutions when enabled',
    withTranslationStrings(en, () => {
      const message = new MessageTimerUpdateMessage(null, translate);

      const {container} = render(
        withThemeAndRootContext(<SystemMessage message={message} />, reactTranslationRenderingRootProviderWrapper),
      );
      const caption = getSystemMessageCaption(container);

      expect(caption).toHaveTextContent('turned off the message timer');
    }),
  );

  it('preserves the sender name and message layout', () => {
    const message = new RenameMessage('new name', undefined, undefined, translateForTest);
    const sender = new User('sender-id', '', translateForTest);
    sender.name('Sender Name');
    message.user(sender);

    const {container} = render(withTheme(<SystemMessage message={message} />));

    expect(container.querySelector('.message-header')).not.toBeNull();
    expect(container.querySelector('.message-header-label__multiline')).not.toBeNull();
    expect(container.querySelector('.message-header-sender-name')).toHaveTextContent('Sender Name');
    expect(container.querySelector('.message-body-actions')).not.toBeNull();
  });

  it('does not render an empty caption', () => {
    const message = new SystemMessageEntity(translateForTest);
    message.caption = '';

    const {container} = render(withTheme(<SystemMessage message={message} />));

    expect(container.querySelector('.system-message-caption')).toBeNull();
  });
});
