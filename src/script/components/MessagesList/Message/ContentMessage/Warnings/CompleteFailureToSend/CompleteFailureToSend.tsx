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

import {Config} from 'src/script/Config';
import {t} from 'Util/LocalizerUtil';

import {backendErrorLink, warning} from '../Warnings.styles';

type Props = {
  onRetry: () => void;
  unreachableDomain?: string;
};

export const CompleteFailureToSendWarning = ({onRetry, unreachableDomain}: Props) => {
  const config = Config.getConfig();
  return (
    <>
      {unreachableDomain ? (
        <p>
          <span
            css={warning}
            dangerouslySetInnerHTML={{
              __html: t('messageCouldNotBeSentBackEndOffline', {domain: unreachableDomain}),
            }}
          />{' '}
          <Link
            targetBlank
            variant={LinkVariant.PRIMARY}
            href={config.URL.SUPPORT.OFFLINE_BACKEND}
            data-uie-name="go-offline-backend"
            css={backendErrorLink}
          >
            {t('offlineBackendLearnMore')}
          </Link>
        </p>
      ) : (
        <p>{t('messageCouldNotBeSentConnectivityIssues')}</p>
      )}
      <div css={{display: 'flex'}}>
        <Button type="button" variant={ButtonVariant.TERTIARY} onClick={onRetry}>
          {t('messageCouldNotBeSentRetry')}
        </Button>
      </div>
    </>
  );
};
