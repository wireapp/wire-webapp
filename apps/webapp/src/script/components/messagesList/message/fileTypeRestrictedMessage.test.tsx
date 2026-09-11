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

import {render} from '@testing-library/react';

import en from 'I18n/en-US.json';
import {FileTypeRestrictedMessage as FileTypeRestrictedMessageEntity} from 'Repositories/entity/message/fileTypeRestrictedMessage';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {setStrings, translate} from 'Util/localizerUtil';

import {FileTypeRestrictedMessage} from './fileTypeRestrictedMessage';

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
      setStrings({en});
    }
  };
}

function createFileTypeRestrictedMessage(
  partialFileTypeRestrictedMessage: Partial<FileTypeRestrictedMessageEntity>,
): FileTypeRestrictedMessageEntity {
  const FileTypeRestrictedMessage: Partial<FileTypeRestrictedMessageEntity> = {
    fileExt: 'txt',
    isIncoming: false,
    name: 'name',
    ...partialFileTypeRestrictedMessage,
  };
  return FileTypeRestrictedMessage as FileTypeRestrictedMessageEntity;
}

function getFileTypeRestrictedMessageText(container: HTMLElement): HTMLElement {
  const messageText = container.querySelector<HTMLElement>('[data-uie-name="filetype-restricted-message-text"]');

  if (messageText === null) {
    throw new Error('Expected the file type restricted message text to be rendered');
  }

  return messageText;
}

describe('FileTypeRestrictedMessage', () => {
  it(
    'preserves incoming legacy rendering and its UIE value',
    withTranslationStrings(en, () => {
      const message = createFileTypeRestrictedMessage({
        isIncoming: true,
        name: 'Alice',
      });

      const {container} = render(<FileTypeRestrictedMessage message={message} />, {
        wrapper: legacyTranslationRootProviderWrapper,
      });
      const messageText = getFileTypeRestrictedMessageText(container);

      expect(messageText.getAttribute('data-uie-value')).toEqual('incoming');
      expect(messageText.textContent).toBe('File from\u00A0Alice\u00A0can’t be opened');
      expect(messageText.querySelector('strong')).toHaveTextContent('Alice');
    }),
  );

  it(
    'preserves outgoing legacy rendering and its UIE value',
    withTranslationStrings(en, () => {
      const message = createFileTypeRestrictedMessage({
        fileExt: 'txt',
        isIncoming: false,
      });

      const {container} = render(<FileTypeRestrictedMessage message={message} />, {
        wrapper: legacyTranslationRootProviderWrapper,
      });
      const messageText = getFileTypeRestrictedMessageText(container);

      expect(messageText.getAttribute('data-uie-value')).toEqual('outgoing');
      expect(messageText.textContent).toBe(
        'Sharing files with the txt extension is not permitted by your organization',
      );
    }),
  );

  it(
    'renders incoming bold formatting and an opaque runtime name when enabled',
    withTranslationStrings(en, () => {
      const message = createFileTypeRestrictedMessage({
        isIncoming: true,
        name: 'Alice',
      });

      const {container} = render(<FileTypeRestrictedMessage message={message} />, {
        wrapper: reactTranslationRenderingRootProviderWrapper,
      });
      const messageText = getFileTypeRestrictedMessageText(container);
      const strong = messageText.querySelector('strong');

      expect(messageText.textContent).toBe('File from\u00A0Alice\u00A0can’t be opened');
      expect(strong).toHaveTextContent('Alice');
      expect(messageText.textContent).not.toContain('&nbsp;');
    }),
  );

  it(
    'lets the translation move the incoming name outside the bold region',
    withTranslationStrings(
      {
        ...en,
        fileTypeRestrictedIncoming: 'File owner: {name}. [bold]Opening is blocked.[/bold]',
      },
      () => {
        const message = createFileTypeRestrictedMessage({
          isIncoming: true,
          name: 'Alice',
        });

        const {container} = render(<FileTypeRestrictedMessage message={message} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        const messageText = getFileTypeRestrictedMessageText(container);
        const strong = messageText.querySelector('strong');

        expect(messageText.textContent).toBe('File owner: Alice. Opening is blocked.');
        expect(strong).toHaveTextContent('Opening is blocked.');
        expect(strong?.textContent).not.toContain('Alice');
      },
    ),
  );

  it(
    'lets the translation move the incoming bold region around the name',
    withTranslationStrings(
      {
        ...en,
        fileTypeRestrictedIncoming: '[bold]File owner {name} cannot open this file[/bold].',
      },
      () => {
        const message = createFileTypeRestrictedMessage({
          isIncoming: true,
          name: 'Alice',
        });

        const {container} = render(<FileTypeRestrictedMessage message={message} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        const messageText = getFileTypeRestrictedMessageText(container);
        const strong = messageText.querySelector('strong');

        expect(messageText.textContent).toBe('File owner Alice cannot open this file.');
        expect(strong).toHaveTextContent('File owner Alice cannot open this file');
      },
    ),
  );

  it(
    'keeps an HTML-looking incoming name opaque',
    withTranslationStrings(en, () => {
      const message = createFileTypeRestrictedMessage({
        isIncoming: true,
        name: 'R&D <Test>',
      });

      const {container} = render(<FileTypeRestrictedMessage message={message} />, {
        wrapper: reactTranslationRenderingRootProviderWrapper,
      });
      const messageText = getFileTypeRestrictedMessageText(container);

      expect(messageText.textContent).toBe('File from\u00A0R&D <Test>\u00A0can’t be opened');
      expect(messageText.querySelector('test')).toBeNull();
    }),
  );

  it(
    'keeps a translation-looking incoming name literal without nested strong elements',
    withTranslationStrings(en, () => {
      const message = createFileTypeRestrictedMessage({
        isIncoming: true,
        name: '[bold]Alice[/bold]',
      });

      const {container} = render(<FileTypeRestrictedMessage message={message} />, {
        wrapper: reactTranslationRenderingRootProviderWrapper,
      });
      const messageText = getFileTypeRestrictedMessageText(container);

      expect(messageText.textContent).toBe('File from\u00A0[bold]Alice[/bold]\u00A0can’t be opened');
      expect(messageText.querySelectorAll('strong')).toHaveLength(1);
      expect(messageText.querySelector('strong')).toHaveTextContent('[bold]Alice[/bold]');
      expect(messageText.querySelector('strong strong')).toBeNull();
    }),
  );

  it(
    'converts every exact incoming non-breaking-space token to U+00A0',
    withTranslationStrings(
      {
        ...en,
        fileTypeRestrictedIncoming: 'A&nbsp;&nbsp;[bold]{name}[/bold]&nbsp;B',
      },
      () => {
        const message = createFileTypeRestrictedMessage({
          isIncoming: true,
          name: 'Alice',
        });

        const {container} = render(<FileTypeRestrictedMessage message={message} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        const messageText = getFileTypeRestrictedMessageText(container);

        expect(messageText.textContent).toBe('A\u00A0\u00A0Alice\u00A0B');
        expect(messageText.textContent).not.toContain('&nbsp;');
      },
    ),
  );

  it(
    'converts non-breaking-space tokens inside incoming bold formatting',
    withTranslationStrings(
      {
        ...en,
        fileTypeRestrictedIncoming: 'A[bold]&nbsp;{name}&nbsp;[/bold]B',
      },
      () => {
        const message = createFileTypeRestrictedMessage({
          isIncoming: true,
          name: 'Alice',
        });

        const {container} = render(<FileTypeRestrictedMessage message={message} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        const messageText = getFileTypeRestrictedMessageText(container);
        const strong = messageText.querySelector('strong');

        expect(messageText.textContent).toBe('A\u00A0Alice\u00A0B');
        expect(strong?.textContent).toBe('\u00A0Alice\u00A0');
      },
    ),
  );

  it(
    'keeps unsupported incoming HTML and entities as text',
    withTranslationStrings(
      {
        ...en,
        fileTypeRestrictedIncoming: '&copy;<img src="example">{name}',
      },
      () => {
        const message = createFileTypeRestrictedMessage({
          isIncoming: true,
          name: 'Alice',
        });

        const {container} = render(<FileTypeRestrictedMessage message={message} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        const messageText = getFileTypeRestrictedMessageText(container);

        expect(messageText.textContent).toBe('&copy;<img src="example">Alice');
        expect(messageText.querySelector('img')).toBeNull();
      },
    ),
  );

  it(
    'renders an outgoing extension as opaque React text',
    withTranslationStrings(
      {
        ...en,
        fileTypeRestrictedOutgoing: 'Extension: {fileExt} is blocked',
      },
      () => {
        const message = createFileTypeRestrictedMessage({
          fileExt: '<script>',
          isIncoming: false,
        });

        const {container} = render(<FileTypeRestrictedMessage message={message} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        const messageText = getFileTypeRestrictedMessageText(container);

        expect(messageText.textContent).toBe('Extension: <script> is blocked');
        expect(messageText.querySelector('script')).toBeNull();
      },
    ),
  );

  it(
    'keeps a translation-looking outgoing extension literal',
    withTranslationStrings(
      {
        ...en,
        fileTypeRestrictedOutgoing: 'Extension: {fileExt} is blocked',
      },
      () => {
        const message = createFileTypeRestrictedMessage({
          fileExt: '[bold]exe[/bold]',
          isIncoming: false,
        });

        const {container} = render(<FileTypeRestrictedMessage message={message} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        const messageText = getFileTypeRestrictedMessageText(container);

        expect(messageText.textContent).toBe('Extension: [bold]exe[/bold] is blocked');
        expect(messageText.querySelector('strong')).toBeNull();
      },
    ),
  );

  it(
    'keeps unsupported outgoing HTML and entities as text',
    withTranslationStrings(
      {
        ...en,
        fileTypeRestrictedOutgoing: '&copy;<img src="example"> {fileExt}',
      },
      () => {
        const message = createFileTypeRestrictedMessage({
          fileExt: 'exe',
          isIncoming: false,
        });

        const {container} = render(<FileTypeRestrictedMessage message={message} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        const messageText = getFileTypeRestrictedMessageText(container);

        expect(messageText.textContent).toBe('&copy;<img src="example"> exe');
        expect(messageText.querySelector('img')).toBeNull();
      },
    ),
  );
});
