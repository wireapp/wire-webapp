/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {render, waitFor} from '@testing-library/react';

import {withTheme} from 'src/script/auth/util/test/TestUtil';

import {EmojiPicker} from './EmojiPicker';

import {handleClickOutsideOfInputBar} from '../InputBar/util/clickHandlers';

describe('EmojiPicker', () => {
  it('marks the dialog as ignored for input bar outside-click handling', async () => {
    const wrapperRef = React.createRef<HTMLDivElement>();
    const {getByTestId} = render(
      withTheme(
        <div ref={wrapperRef}>
          <EmojiPicker
            posX={100}
            posY={100}
            onKeyPress={() => {
              return undefined;
            }}
            resetActionMenuStates={() => {
              return undefined;
            }}
            wrapperRef={wrapperRef}
            handleReactionClick={() => {
              return undefined;
            }}
          />
        </div>,
      ),
    );

    await waitFor(() => {
      expect(getByTestId('emoji-picker-dialog')).toBeDefined();
    });

    expect(getByTestId('emoji-picker-dialog')).toHaveAttribute('data-outside-click-ignore');
  });

  it('does not treat emoji picker clicks as outside input bar clicks', async () => {
    const wrapperRef = React.createRef<HTMLDivElement>();
    const handleOutsideClick = jest.fn();
    const {getByTestId} = render(
      withTheme(
        <div ref={wrapperRef}>
          <EmojiPicker
            posX={100}
            posY={100}
            onKeyPress={() => undefined}
            resetActionMenuStates={() => undefined}
            wrapperRef={wrapperRef}
            handleReactionClick={() => undefined}
          />
        </div>,
      ),
    );

    await waitFor(() => {
      expect(getByTestId('emoji-picker-dialog')).toBeDefined();
    });

    handleClickOutsideOfInputBar({target: getByTestId('emoji-picker-dialog')} as Event, handleOutsideClick);

    expect(handleOutsideClick).not.toHaveBeenCalled();
  });
});
