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

import {fireEvent, render} from '@testing-library/react';
import {t} from 'Util/LocalizerUtil';

import {ShowMoreButton} from './ShowMoreButton';

describe('ShowMoreButton', () => {
  it('toggles button show more/show less for a quoted message', () => {
    let show = true;
    const setShowFullText = jest.fn(show => !show);
    const {getByTestId, getByText, rerender} = render(
      <ShowMoreButton active={show} onClick={setShowFullText} isFocusable />,
    );

    expect(getByText(t('replyQuoteShowLess'))).not.toBeNull();

    const toggleShowBtn = getByTestId('do-show-more-quote');
    fireEvent.click(toggleShowBtn);
    expect(setShowFullText).toHaveBeenCalled();

    show = false;

    // re-render the same component with different props
    rerender(<ShowMoreButton active={show} onClick={setShowFullText} isFocusable />);
    fireEvent.click(toggleShowBtn);

    expect(setShowFullText).toHaveBeenCalled();
    expect(getByText(t('replyQuoteShowMore'))).not.toBeNull();
  });
});
