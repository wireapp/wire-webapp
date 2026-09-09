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

import {useState} from 'react';
import type {FunctionComponent, ReactNode} from 'react';

import * as Icon from 'Components/icon';
import {DecryptErrorMessage as DecryptErrorMessageEntity} from 'Repositories/entity/message/decryptErrorMessage';
import {Config} from 'src/script/Config';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {MotionDuration} from 'src/script/motion/MotionDuration';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {createReactTranslationMarker, renderReactTranslation} from 'Util/localizerUtil/reactLocalizerUtil';
import type {Translate} from 'Util/localizerUtil/translationTypes';
import {splitFingerprint} from 'Util/stringUtil';

import {messageBodyWrapper} from './contentMessage/contentMessage.styles';

import {FormattedId} from '../../../page/mainContent/panels/preferences/devicesPreferences/components/formattedId';

type DecryptErrorMessageProps = {
  message: DecryptErrorMessageEntity;
  onClickResetSession: (message: DecryptErrorMessageEntity) => void;
};

type TranslateDecryptErrorCaptionOptions = {
  readonly translate: Translate;
  readonly userSubstitution: string;
  readonly isIdentityChanged: boolean;
};

type RenderDecryptErrorCaptionOptions = {
  readonly isIdentityChanged: boolean;
  readonly isReactTranslationRenderingEnabled: boolean;
  readonly translate: Translate;
  readonly userName: string;
};

const decryptErrorUserMarker = createReactTranslationMarker('decrypt-error-user');
const decryptErrorHighlightSubstitutions = {
  '/highlight': '</span>',
  highlight: '<span class="label-bold-xs">',
};

function translateDecryptErrorCaption(options: TranslateDecryptErrorCaptionOptions): string {
  const {isIdentityChanged, translate, userSubstitution} = options;
  let translationKey: 'conversationUnableToDecrypt1' | 'conversationUnableToDecrypt2';

  if (isIdentityChanged) {
    translationKey = 'conversationUnableToDecrypt2';
  } else {
    translationKey = 'conversationUnableToDecrypt1';
  }

  return translate(translationKey, {user: userSubstitution}, decryptErrorHighlightSubstitutions);
}

function renderDecryptErrorCaption(options: RenderDecryptErrorCaptionOptions): ReactNode {
  const {isIdentityChanged, isReactTranslationRenderingEnabled, translate, userName} = options;

  if (isReactTranslationRenderingEnabled) {
    const translatedText = translateDecryptErrorCaption({
      isIdentityChanged,
      translate,
      userSubstitution: decryptErrorUserMarker.substitution,
    });

    return renderReactTranslation({
      translatedText,
      componentReplacements: [
        {
          start: '<span class="label-bold-xs">',
          end: '</span>',
          render(children) {
            return <span className="label-bold-xs">{children}</span>;
          },
        },
      ],
      nodeReplacements: [],
      valueReplacements: [{marker: decryptErrorUserMarker, runtimeText: userName}],
    });
  }

  const legacyCaption = translateDecryptErrorCaption({
    isIdentityChanged,
    translate,
    userSubstitution: userName,
  });

  return <span dangerouslySetInnerHTML={{__html: legacyCaption}} />;
}

const DecryptErrorMessage: FunctionComponent<DecryptErrorMessageProps> = function DecryptErrorMessage({
  message,
  onClickResetSession,
}): ReactNode {
  const [isResettingSession, setIsResettingSession] = useState(false);
  const {isFeatureToggleEnabled, translate} = useApplicationContext();

  const link = Config.getConfig().URL.SUPPORT.DECRYPT_ERROR;
  const isReactTranslationRenderingEnabled = isFeatureToggleEnabled(reactTranslationRenderingFeatureToggleName);
  const decryptErrorCaption = renderDecryptErrorCaption({
    isIdentityChanged: message.isIdentityChanged,
    isReactTranslationRenderingEnabled,
    translate,
    userName: message.user().name(),
  });

  return (
    <div data-uie-name="element-message-decrypt-error">
      <div className="message-header">
        <div className="message-header-icon">
          <span className="icon-sysmsg-error text-red" />
        </div>

        <div className="message-header-label">
          <p>
            {decryptErrorCaption}
            <span>&nbsp;</span>
            <a
              className="accent-text"
              href={link}
              rel="nofollow noopener noreferrer"
              target="_blank"
              data-uie-name="go-decrypt-error-link"
            >
              {translate('conversationUnableToDecryptLink')}
            </a>
          </p>
        </div>
      </div>

      <div css={messageBodyWrapper()}>
        <div className="message-body message-body-decrypt-error">
          <p className="message-header-decrypt-error-label" data-uie-name="status-decrypt-error">
            {message.code && (
              <>
                {`${translate('conversationUnableToDecryptErrorMessage')} `}
                <span className="label-bold-xs">{message.code}</span>{' '}
              </>
            )}
            {message.clientId && (
              <>
                {'ID: '}
                <FormattedId idSlices={splitFingerprint(message.clientId)} smallPadding />
              </>
            )}
          </p>

          {message.isRecoverable && (
            <div className="message-header-decrypt-reset-session">
              {isResettingSession ? (
                <Icon.LoadingIcon className="accent-fill" data-uie-name="status-loading" />
              ) : (
                <button
                  type="button"
                  className="button-reset-default message-header-decrypt-reset-session-action button-label accent-text"
                  onClick={() => {
                    setIsResettingSession(true);
                    onClickResetSession(message);
                    setTimeout(() => setIsResettingSession(false), MotionDuration.LONG);
                  }}
                  data-uie-name="do-reset-encryption-session"
                >
                  {translate('conversationUnableToDecryptResetSession')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export {DecryptErrorMessage};
