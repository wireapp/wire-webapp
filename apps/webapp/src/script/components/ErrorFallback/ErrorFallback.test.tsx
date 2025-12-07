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

import {render} from '@testing-library/react';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {ErrorBoundary} from 'react-error-boundary';

import {ErrorFallback} from './ErrorFallback';

const SimpleError: React.FC = () => {
  throw new Error('failed to render');
};

describe('ErrorFallback', () => {
  it('Correctly prints the error', () => {
    const action = jest.fn();
    jest.spyOn(PrimaryModal, 'show').mockImplementation((_, payload) => action());

    render(
      <div>
        <ErrorBoundary FallbackComponent={ErrorFallback}>{<SimpleError />}</ErrorBoundary>
      </div>,
    );

    expect(action).toHaveBeenCalled();
  });
});
