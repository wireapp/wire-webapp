/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import assert from 'node:assert';

import {render} from '@testing-library/react';
import {isUndefined} from '@sindresorhus/is';

import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import type {Translate} from 'Util/localizerUtil';

import {MessageContent} from './MessageContent';
import type {PrimaryModalTranslatedMessage} from '../PrimaryModalTranslatedMessage';

const translationKey = 'modalOpenLinkMessage';

function createTranslateForTest(translation: string): Translate {
  return function translate(identifier, substitutions, dangerousSubstitutions): string {
    let translatedText: string = identifier;
    if (identifier === translationKey) {
      translatedText = translation;
    }

    if (!isUndefined(substitutions)) {
      for (const [placeholder, replacement] of Object.entries(substitutions)) {
        translatedText = translatedText.replaceAll(`{${placeholder}}`, replacement.toString());
      }
    }

    if (!isUndefined(dangerousSubstitutions)) {
      for (const [marker, replacement] of Object.entries(dangerousSubstitutions)) {
        translatedText = translatedText.replaceAll(`[${marker}]`, replacement);
      }
    }

    return translatedText;
  };
}

function createTranslatedMessage(): PrimaryModalTranslatedMessage {
  return {
    compatibilityReplacements: [],
    components: [
      {kind: 'bold', markerName: 'bold'},
      {kind: 'line-break', legacyTokens: [], markerName: 'br'},
      {
        className: 'read-more',
        dataUieName: 'read-more-test',
        href: 'https://example.test/support',
        kind: 'link',
        legacyClosingTokens: [],
        legacyOpeningTokens: [],
        markerName: 'link',
        rel: 'nofollow noopener noreferrer',
        target: '_blank',
      },
    ],
    kind: 'translation',
    layout: 'default',
    translationKey,
    values: [
      {
        alternatePlaceholders: [],
        placeholder: 'name',
        runtimeText: 'R&D <Test>',
      },
    ],
  };
}

function createRootProviderWrapper(
  isReactTranslationRenderingEnabled: boolean,
): ReturnType<typeof createRootProviderWrapperForTest> {
  return createRootProviderWrapperForTest(
    createRootContextValueForTest({
      isFeatureToggleEnabled(featureName) {
        return isReactTranslationRenderingEnabled && featureName === reactTranslationRenderingFeatureToggleName;
      },
      translate: createTranslateForTest(''),
    }),
  );
}

describe('MessageContent', () => {
  it('keeps legacy htmlMessage rendering when React translation rendering is disabled', () => {
    const {container} = render(
      <MessageContent
        message={null}
        messageHtml={'<strong>Legacy</strong>'}
        translate={createTranslateForTest('')}
        translatedMessage={createTranslatedMessage()}
      />,
      {wrapper: createRootProviderWrapper(false)},
    );

    expect(container.querySelector('strong')).toHaveTextContent('Legacy');
    expect(container).not.toHaveTextContent('ignored');
  });

  it('renders legacy rich content and normal message independently when disabled', () => {
    const {container} = render(
      <MessageContent
        message="Normal message"
        messageHtml={'<strong>Legacy HTML</strong>'}
        translate={createTranslateForTest('ignored')}
        translatedMessage={createTranslatedMessage()}
      />,
      {wrapper: createRootProviderWrapper(false)},
    );
    const legacyHtmlSlot = container.querySelector('#modal-description-html');
    const normalMessageSlot = container.querySelector('#modal-description-text');

    assert(legacyHtmlSlot !== null);
    assert(normalMessageSlot !== null);
    expect(legacyHtmlSlot.querySelector('strong')).toHaveTextContent('Legacy HTML');
    expect(normalMessageSlot).toHaveTextContent('Normal message');
    expect(normalMessageSlot.querySelector('strong')).toBeNull();
    expect(container).not.toHaveTextContent('ignored');
  });

  it('renders translated rich content and normal message independently when enabled', () => {
    const {container} = render(
      <MessageContent
        message="Normal message"
        messageHtml={'<strong>Legacy HTML</strong>'}
        translate={createTranslateForTest('[bold]Translated {name}[/bold]')}
        translatedMessage={createTranslatedMessage()}
      />,
      {wrapper: createRootProviderWrapper(true)},
    );
    const translatedMessageSlot = container.querySelector('#modal-description-html');
    const normalMessageSlot = container.querySelector('#modal-description-text');

    assert(translatedMessageSlot !== null);
    assert(normalMessageSlot !== null);
    expect(translatedMessageSlot.querySelector('strong')).toHaveTextContent('R&D <Test>');
    expect(translatedMessageSlot).not.toHaveTextContent('Legacy HTML');
    expect(normalMessageSlot).toHaveTextContent('Normal message');
    expect(normalMessageSlot.querySelector('strong')).toBeNull();
  });

  it('renders translated messages as React nodes when enabled', () => {
    const translatedMessage = createTranslatedMessage();
    const {container} = render(
      <MessageContent
        message={null}
        messageHtml={'<img src="example">Legacy'}
        translate={createTranslateForTest('[bold]Before {name}[/bold][br][link]Open[/link]')}
        translatedMessage={translatedMessage}
      />,
      {wrapper: createRootProviderWrapper(true)},
    );

    expect(container.querySelectorAll('strong')).toHaveLength(1);
    expect(container.querySelector('strong')).toHaveTextContent('R&D <Test>');
    expect(container.querySelectorAll('br')).toHaveLength(1);
    expect(container.querySelector('a')).toHaveAttribute('href', 'https://example.test/support');
    expect(container.querySelector('a')).toHaveAttribute('target', '_blank');
    expect(container.querySelector('a')).toHaveAttribute('rel', 'nofollow noopener noreferrer');
    expect(container.querySelector('a')).toHaveAttribute('data-uie-name', 'read-more-test');
    expect(container.querySelector('a')).toHaveClass('read-more');
    expect(container.querySelector('img')).toBeNull();
  });

  it('keeps unsupported translated markup as text', () => {
    const {container} = render(
      <MessageContent
        message={null}
        translate={createTranslateForTest('<img src="example">System update')}
        translatedMessage={createTranslatedMessage()}
      />,
      {wrapper: createRootProviderWrapper(true)},
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('<img src="example">System update');
  });

  it('renders repeated runtime values as opaque text', () => {
    const {container} = render(
      <MessageContent
        message={null}
        translate={createTranslateForTest('[bold]{name}[/bold] and [bold]{name}[/bold]')}
        translatedMessage={createTranslatedMessage()}
      />,
      {wrapper: createRootProviderWrapper(true)},
    );

    expect(container.querySelectorAll('strong')).toHaveLength(2);
    expect(container.querySelectorAll('strong')[0]).toHaveTextContent('R&D <Test>');
    expect(container.querySelectorAll('strong')[1]).toHaveTextContent('R&D <Test>');
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('test')).toBeNull();
  });

  it('renders audited literal line-break tokens as React line breaks', () => {
    const translatedMessage: PrimaryModalTranslatedMessage = {
      compatibilityReplacements: [],
      components: [{kind: 'line-break', legacyTokens: ['<br/>'], markerName: 'br'}],
      kind: 'translation',
      layout: 'default',
      translationKey: 'modalOpenLinkMessage',
      values: [
        {
          alternatePlaceholders: [],
          placeholder: 'name',
          runtimeText: '[link]Admin[/link]',
        },
      ],
    };

    const {container} = render(
      <MessageContent
        message={null}
        translate={createTranslateForTest('{name}<br/>{name}')}
        translatedMessage={translatedMessage}
      />,
      {wrapper: createRootProviderWrapper(true)},
    );

    expect(container.querySelectorAll('br')).toHaveLength(1);
    expect(container).toHaveTextContent('[link]Admin[/link][link]Admin[/link]');
    expect(container.querySelector('a')).toBeNull();
  });

  it('keeps empty messages absent', () => {
    const {container} = render(
      <MessageContent message={null} messageHtml="" translate={createTranslateForTest('')} />,
      {wrapper: createRootProviderWrapper(true)},
    );

    expect(container.firstChild).toBeNull();
  });
});
