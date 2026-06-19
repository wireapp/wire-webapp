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

import {Button, ButtonVariant, Link, LinkVariant} from '@wireapp/react-ui-kit';

import {useMessageFocusedTabIndex} from 'Components/MessagesList/Message/util';
import {Config} from 'src/script/Config';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {backendErrorLink, button, warning, wrapper} from '../Warnings.styles';

type Props = {
  isMessageFocused: boolean;
  onRetry: () => void;
  unreachableDomain?: string;
};

const config = Config.getConfig();

export const CompleteFailureToSendWarning = ({isMessageFocused, onRetry, unreachableDomain}: Props) => {
  const {translate} = useApplicationContext();
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);
  return (
    <div css={wrapper}>
      {unreachableDomain !== undefined && unreachableDomain !== '' ? (
        <p>
          <span
            css={warning}
            dangerouslySetInnerHTML={{
              __html: translate('messageCouldNotBeSentBackEndOffline', {domain: unreachableDomain}),
            }}
          />{' '}
          <Link
            tabIndex={messageFocusedTabIndex}
            targetBlank
            variant={LinkVariant.PRIMARY}
            href={config.URL.SUPPORT.OFFLINE_BACKEND}
            data-uie-name="go-offline-backend"
            css={backendErrorLink}
          >
            {translate('offlineBackendLearnMore')}
          </Link>
        </p>
      ) : (
        <p css={warning}>{translate('messageCouldNotBeSentConnectivityIssues')}</p>
      )}
      <div css={{display: 'flex'}}>
        <Button
          css={button}
          tabIndex={messageFocusedTabIndex}
          type="button"
          variant={ButtonVariant.TERTIARY}
          onClick={onRetry}
        >
          {translate('messageCouldNotBeSentRetry')}
        </Button>
      </div>
    </div>
  );
};
