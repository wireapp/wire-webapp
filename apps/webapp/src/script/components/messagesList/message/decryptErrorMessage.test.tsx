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

import {act} from 'react';
import {render, fireEvent} from '@testing-library/react';
import {isNull} from '@sindresorhus/is';
import {ProteusErrors} from '@wireapp/core/lib/messagingProtocols/proteus';

import en from 'I18n/en-US.json';
import {DecryptErrorMessage as DecryptErrorMessageEntity} from 'Repositories/entity/message/decryptErrorMessage';
import {User} from 'Repositories/entity/User';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {translateForTest} from 'Util/test/translateForTest';
import {setStrings, translate} from 'Util/localizerUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {DecryptErrorMessage} from './decryptErrorMessage';

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
      setStrings({en});
    }
  };
}

function createError(code: number, userName = 'Alice'): DecryptErrorMessageEntity {
  const error = new DecryptErrorMessageEntity('client', code, translateForTest);
  const user = new User('', '', translateForTest);
  user.name(userName);
  error.user(user);

  return error;
}

function getDecryptErrorCaption(container: HTMLElement): HTMLElement {
  const decryptErrorCaption = container.querySelector<HTMLElement>('.message-header-label > p');

  if (isNull(decryptErrorCaption)) {
    throw new Error('Expected the decrypt error caption to be rendered');
  }

  return decryptErrorCaption;
}

describe('DecryptErrorMessage', () => {
  it(
    'preserves the legacy highlighted caption when React translation rendering is disabled',
    withTranslationStrings(en, () => {
      const props = {
        message: createError(ProteusErrors.InvalidMessage),
        onClickResetSession: jest.fn(),
      };

      const {container} = render(<DecryptErrorMessage {...props} />, {wrapper: legacyTranslationRootProviderWrapper});
      const decryptErrorCaption = getDecryptErrorCaption(container);

      expect(decryptErrorCaption).toHaveTextContent('A message from Alice was not received.');
      expect(decryptErrorCaption.querySelectorAll('.label-bold-xs')).toHaveLength(1);
      expect(decryptErrorCaption.querySelector('.label-bold-xs')).toHaveTextContent('Alice');
    }),
  );

  it(
    'renders conversationUnableToDecrypt1 with React highlighting when enabled',
    withTranslationStrings(en, () => {
      const props = {
        message: createError(ProteusErrors.InvalidMessage),
        onClickResetSession: jest.fn(),
      };

      const {container} = render(<DecryptErrorMessage {...props} />, {
        wrapper: reactTranslationRenderingRootProviderWrapper,
      });
      const decryptErrorCaption = getDecryptErrorCaption(container);

      expect(decryptErrorCaption).toHaveTextContent('A message from Alice was not received.');
      expect(decryptErrorCaption.querySelectorAll('.label-bold-xs')).toHaveLength(1);
      expect(decryptErrorCaption.querySelector('.label-bold-xs')).toHaveTextContent('Alice');
    }),
  );

  it(
    'renders conversationUnableToDecrypt2 with React highlighting when enabled',
    withTranslationStrings(en, () => {
      const props = {
        message: createError(ProteusErrors.RemoteIdentityChanged),
        onClickResetSession: jest.fn(),
      };

      const {container} = render(<DecryptErrorMessage {...props} />, {
        wrapper: reactTranslationRenderingRootProviderWrapper,
      });
      const decryptErrorCaption = getDecryptErrorCaption(container);

      expect(decryptErrorCaption).toHaveTextContent('Alice´s device identity changed. Undelivered message.');
      expect(decryptErrorCaption.querySelectorAll('.label-bold-xs')).toHaveLength(1);
      expect(decryptErrorCaption.querySelector('.label-bold-xs')).toHaveTextContent('Alice');
    }),
  );

  it(
    'renders a translation without highlight markup correctly',
    withTranslationStrings(
      {
        ...en,
        conversationUnableToDecrypt1: 'A message from {user} was not received.',
      },
      () => {
        const props = {
          message: createError(ProteusErrors.InvalidMessage),
          onClickResetSession: jest.fn(),
        };

        const {container} = render(<DecryptErrorMessage {...props} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        const decryptErrorCaption = getDecryptErrorCaption(container);

        expect(decryptErrorCaption).toHaveTextContent('A message from Alice was not received.');
        expect(decryptErrorCaption.querySelectorAll('.label-bold-xs')).toHaveLength(0);
      },
    ),
  );

  it(
    'renders an HTML-looking runtime user name as text',
    withTranslationStrings(en, () => {
      const props = {
        message: createError(ProteusErrors.InvalidMessage, 'R&D <Test>'),
        onClickResetSession: jest.fn(),
      };

      const {container} = render(<DecryptErrorMessage {...props} />, {
        wrapper: reactTranslationRenderingRootProviderWrapper,
      });
      const decryptErrorCaption = getDecryptErrorCaption(container);

      expect(decryptErrorCaption).toHaveTextContent('A message from R&D <Test> was not received.');
      expect(decryptErrorCaption.querySelector('test')).toBeNull();
      expect(decryptErrorCaption.querySelectorAll('.label-bold-xs')).toHaveLength(1);
      expect(decryptErrorCaption.querySelector('.label-bold-xs')).toHaveTextContent('R&D <Test>');
    }),
  );

  it(
    'keeps a translation-looking runtime user name literal inside highlighting',
    withTranslationStrings(en, () => {
      const props = {
        message: createError(ProteusErrors.InvalidMessage, '[highlight]Alice[/highlight]'),
        onClickResetSession: jest.fn(),
      };

      const {container} = render(<DecryptErrorMessage {...props} />, {
        wrapper: reactTranslationRenderingRootProviderWrapper,
      });
      const decryptErrorCaption = getDecryptErrorCaption(container);

      expect(decryptErrorCaption).toHaveTextContent('A message from [highlight]Alice[/highlight] was not received.');
      expect(decryptErrorCaption.querySelectorAll('.label-bold-xs')).toHaveLength(1);
      expect(decryptErrorCaption.querySelector('.label-bold-xs')).toHaveTextContent('[highlight]Alice[/highlight]');
      expect(decryptErrorCaption.querySelector('.label-bold-xs .label-bold-xs')).toBeNull();
    }),
  );

  it(
    'renders the user name outside translation-authored highlighting',
    withTranslationStrings(
      {
        ...en,
        conversationUnableToDecrypt1: 'A message from {user} was not received.',
      },
      () => {
        const props = {
          message: createError(ProteusErrors.InvalidMessage),
          onClickResetSession: jest.fn(),
        };

        const {container} = render(<DecryptErrorMessage {...props} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        const decryptErrorCaption = getDecryptErrorCaption(container);

        expect(decryptErrorCaption).toHaveTextContent('A message from Alice was not received.');
        expect(decryptErrorCaption.querySelectorAll('.label-bold-xs')).toHaveLength(0);
      },
    ),
  );

  it(
    'keeps a translation-looking runtime user name literal outside highlighting',
    withTranslationStrings(
      {
        ...en,
        conversationUnableToDecrypt1: 'A message from {user} was not received.',
      },
      () => {
        const props = {
          message: createError(ProteusErrors.InvalidMessage, '[highlight]Alice[/highlight]'),
          onClickResetSession: jest.fn(),
        };

        const {container} = render(<DecryptErrorMessage {...props} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        const decryptErrorCaption = getDecryptErrorCaption(container);

        expect(decryptErrorCaption).toHaveTextContent('A message from [highlight]Alice[/highlight] was not received.');
        expect(decryptErrorCaption.querySelectorAll('.label-bold-xs')).toHaveLength(0);
      },
    ),
  );

  it(
    'keeps unsupported translation markup as text',
    withTranslationStrings(
      {
        ...en,
        conversationUnableToDecrypt1:
          '<img src="example">A message from [highlight]{user}[/highlight] was not received.',
      },
      () => {
        const props = {
          message: createError(ProteusErrors.InvalidMessage),
          onClickResetSession: jest.fn(),
        };

        const {container} = render(<DecryptErrorMessage {...props} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        const decryptErrorCaption = getDecryptErrorCaption(container);

        expect(decryptErrorCaption).toHaveTextContent('<img src="example">A message from Alice was not received.');
        expect(decryptErrorCaption.querySelector('img')).toBeNull();
        expect(decryptErrorCaption.querySelectorAll('.label-bold-xs')).toHaveLength(1);
      },
    ),
  );

  it('shows "reset session" action when error is recoverable', async () => {
    const props = {
      message: createError(ProteusErrors.InvalidMessage),
      onClickResetSession: jest.fn(),
    };

    const {getByText} = render(<DecryptErrorMessage {...props} />, {wrapper: rootProviderWrapper});

    expect(getByText('conversationUnableToDecryptResetSession')).not.toBeNull();

    expect(getByText('conversationUnableToDecrypt1')).not.toBeNull();
  });

  it('shows remote identity changed error if sender has changed identity', async () => {
    const props = {
      message: createError(ProteusErrors.RemoteIdentityChanged),
      onClickResetSession: jest.fn(),
    };

    const {getByText, queryByText} = render(<DecryptErrorMessage {...props} />, {wrapper: rootProviderWrapper});

    expect(getByText('conversationUnableToDecrypt2')).not.toBeNull();
    expect(queryByText('conversationUnableToDecryptResetSession')).toBeNull();
  });

  it('shows loading spinner during session reset', async () => {
    jest.useFakeTimers();
    const props = {
      message: createError(200),
      onClickResetSession: jest.fn(),
    };

    const {getByTestId, queryByTestId} = render(<DecryptErrorMessage {...props} />, {wrapper: rootProviderWrapper});

    const decryptErrorMessage = queryByTestId('element-message-decrypt-error');
    expect(decryptErrorMessage).not.toBeNull();

    const resetEncryptionSessionLoadingSpinner = queryByTestId('status-loading');
    expect(resetEncryptionSessionLoadingSpinner).toBeNull();

    const resetEncryptionSessionLink = getByTestId('do-reset-encryption-session');

    act(() => {
      fireEvent.click(resetEncryptionSessionLink);
    });

    expect(props.onClickResetSession).toHaveBeenCalled();

    expect(queryByTestId('do-reset-encryption-session')).toBeNull();
    expect(queryByTestId('status-loading')).not.toBeNull();

    act(() => {
      jest.runAllTimers();
    });
    expect(queryByTestId('status-loading')).toBeNull();
    expect(queryByTestId('do-reset-encryption-session')).not.toBeNull();
  });
});
