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

import * as Icon from 'Components/Icon';
import {DecryptErrorMessage as DecryptErrorMessageEntity} from 'Repositories/entity/message/DecryptErrorMessage';
import {Config} from 'src/script/Config';
import {MotionDuration} from 'src/script/motion/MotionDuration';
import {t} from 'Util/LocalizerUtil';
import {splitFingerprint} from 'Util/StringUtil';

import {messageBodyWrapper} from './ContentMessage/ContentMessage.styles';

import {FormattedId} from '../../../page/MainContent/panels/preferences/DevicesPreferences/components/FormattedId';

interface DecryptErrorMessageProps {
  message: DecryptErrorMessageEntity;
  onClickResetSession: (message: DecryptErrorMessageEntity) => void;
}

const DecryptErrorMessage = ({message, onClickResetSession}: DecryptErrorMessageProps) => {
  const [isResettingSession, setIsResettingSession] = useState(false);

  const link = Config.getConfig().URL.SUPPORT.DECRYPT_ERROR;
  const caption = message.isIdentityChanged
    ? t(
        'conversationUnableToDecrypt2',
        {user: message.user().name()},
        {
          '/highlight': '</span>',
          highlight: '<span class="label-bold-xs">',
        },
      )
    : t(
        'conversationUnableToDecrypt1',
        {user: message.user().name()},
        {
          '/highlight': '</span>',
          highlight: '<span class="label-bold-xs">',
        },
      );

  return (
    <div data-uie-name="element-message-decrypt-error">
      <div className="message-header">
        <div className="message-header-icon">
          <span className="icon-sysmsg-error text-red" />
        </div>

        <div className="message-header-label">
          <p>
            <span dangerouslySetInnerHTML={{__html: caption}} />
            <span>&nbsp;</span>
            <a
              className="accent-text"
              href={link}
              rel="nofollow noopener noreferrer"
              target="_blank"
              data-uie-name="go-decrypt-error-link"
            >
              {t('conversationUnableToDecryptLink')}
            </a>
          </p>
        </div>
      </div>

      <div css={messageBodyWrapper()}>
        <div className="message-body message-body-decrypt-error">
          <p className="message-header-decrypt-error-label" data-uie-name="status-decrypt-error">
            {message.code && (
              <>
                {`${t('conversationUnableToDecryptErrorMessage')} `}
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
                  {t('conversationUnableToDecryptResetSession')}
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
