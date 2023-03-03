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

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {Conversation} from 'src/script/entity/Conversation';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {useMainViewModel} from 'src/script/page/RootProvider';
import {t} from 'Util/LocalizerUtil';

import {warning} from '../Warnings.styles';

type Props = {
  conversation: Conversation;
  message: ContentMessage;
};

export const CompleteFailureToSendWarning = ({conversation, message}: Props) => {
  const mainViewModel = useMainViewModel();
  const {content: contentViewModel} = mainViewModel;
  const {messageRepository} = contentViewModel;

  const handleRetrySending = async (textMessage: string, messageId: string) => {
    await messageRepository.handleRetryAttempt(conversation, textMessage, messageId);
  };

  return (
    <>
      {message.getFirstAsset().isText() ? (
        <div>
          <p css={warning}>{t('messageCouldNotBeSent')}</p>

          <Button
            type="button"
            variant={ButtonVariant.TERTIARY}
            onClick={() => handleRetrySending(message.getFirstAsset().text, message.id)}
          >
            {t('messageCouldNotBeSentRetry')}
          </Button>
        </div>
      ) : (
        <div>
          <p css={warning}>{t('messageWillNotBeSent')}</p>

          <Button type="button" variant={ButtonVariant.TERTIARY} onClick={() => {}}>
            {t('messageWillNotBeSentDiscard')}
          </Button>
        </div>
      )}
    </>
  );
};
