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

import React from 'react';
import NamedIcon from 'Components/NamedIcon';
import {DecryptErrorMessage as DecryptErrorMessageEntity} from '../../entity/message/DecryptErrorMessage';
import {registerReactComponent, useKoSubscribable} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import DeviceId from 'Components/DeviceId';

export interface DecryptErrorMessageProps {
  message: DecryptErrorMessageEntity;
  onClickResetSession: (message: DecryptErrorMessageEntity) => void;
}

const DecryptErrorMessage: React.FC<DecryptErrorMessageProps> = ({message, onClickResetSession}) => {
  const isRecoverable = useKoSubscribable(message.is_recoverable);
  const isResettingSession = useKoSubscribable(message.is_resetting_session);
  const link = useKoSubscribable(message.link);
  const htmlCaption = useKoSubscribable(message.htmlCaption);

  return (
    <div data-uie-name="element-message-decrypt-error">
      <div className="message-header">
        <div className="message-header-icon">
          <span className="icon-sysmsg-error text-red" />
        </div>
        <div className="message-header-label ellipsis">
          <span dangerouslySetInnerHTML={{__html: htmlCaption}} />
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
          <hr className="message-header-line" />
        </div>
      </div>
      <div className="message-body message-body-decrypt-error">
        <div className="message-header-decrypt-error-label" data-uie-name="status-decrypt-error">
          {message.error_code && (
            <>
              {`${t('conversationUnableToDecryptErrorMessage')} `}
              <span className="label-bold-xs">{message.error_code}</span>{' '}
            </>
          )}
          {message.client_id && (
            <>
              {'ID: '}
              <DeviceId deviceId={message.client_id} />
            </>
          )}
        </div>
        {isRecoverable && (
          <div className="message-header-decrypt-reset-session">
            {isResettingSession ? (
              <NamedIcon
                className="accent-fill"
                name="loading-icon"
                width="16"
                height="16"
                data-uie-name="status-loading"
              />
            ) : (
              <span
                className="message-header-decrypt-reset-session-action button-label accent-text"
                onClick={() => onClickResetSession(message)}
                data-uie-name="do-reset-encryption-session"
              >
                {t('conversationUnableToDecryptResetSession')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DecryptErrorMessage;

registerReactComponent('decrypt-error-message', {
  component: DecryptErrorMessage,
  template: '<div data-bind="react: {message: ko.unwrap(message), onClickResetSession}"></div>',
});
