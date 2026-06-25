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

import {useEffect} from 'react';

import {FallbackProps} from 'react-error-boundary';

import {PrimaryModal} from 'Components/modals/primaryModal';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {getLogger} from 'Util/logger';

const logger = getLogger('ErrorFallback');

export const ErrorFallback = ({error, resetErrorBoundary}: FallbackProps) => {
  const {translate} = useApplicationContext();

  useEffect(() => {
    const customError = new Error();
    logger.error({originalError: error, originalStack: error?.stack, fallbackInvocationStack: customError.stack});

    PrimaryModal.show(
      PrimaryModal.type.CONFIRM,
      {
        preventClose: true,
        secondaryAction: {
          action: resetErrorBoundary,
          text: translate('unknownApplicationErrorTryAgain'),
        },
        primaryAction: {
          action: () => window.location.reload(),
          text: translate('unknownApplicationErrorReload'),
        },
        text: {
          message: translate('unknownApplicationErrorDescription'),
          title: translate('unknownApplicationErrorTitle'),
        },
      },
      undefined,
      translate,
    );
  }, [error, resetErrorBoundary, translate]);

  return <></>;
};
