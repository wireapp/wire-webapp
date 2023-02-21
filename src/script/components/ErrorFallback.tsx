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

import React, {useEffect} from 'react';

import {FallbackProps} from 'react-error-boundary';

import {getLogger} from 'Util/Logger';

const logger = getLogger('ErrorFallback');

const ErrorFallback: React.FC<FallbackProps> = ({error, resetErrorBoundary}) => {
  useEffect(() => {
    logger.error(error);
  }, [error]);

  return (
    <p role="alert">
      Something went wrong:
      <span data-uie-name="error-message">{error.message}</span>
      <button onClick={resetErrorBoundary}>Try again</button>
    </p>
  );
};

export {ErrorFallback};
