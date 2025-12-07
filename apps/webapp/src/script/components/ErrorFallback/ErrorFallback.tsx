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

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {FallbackProps} from 'react-error-boundary';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

const logger = getLogger('ErrorFallback');

export const ErrorFallback = ({error, resetErrorBoundary}: FallbackProps) => {
  useEffect(() => {
    const customError = new Error();
    logger.error({originalError: error, originalStack: error?.stack, fallbackInvocationStack: customError.stack});

    PrimaryModal.show(PrimaryModal.type.CONFIRM, {
      preventClose: true,
      secondaryAction: {
        action: resetErrorBoundary,
        text: t('unknownApplicationErrorTryAgain'),
      },
      primaryAction: {
        action: () => window.location.reload(),
        text: t('unknownApplicationErrorReload'),
      },
      text: {
        message: t('unknownApplicationErrorDescription'),
        title: t('unknownApplicationErrorTitle'),
      },
    });
  }, [error, resetErrorBoundary]);

  return <></>;
};
