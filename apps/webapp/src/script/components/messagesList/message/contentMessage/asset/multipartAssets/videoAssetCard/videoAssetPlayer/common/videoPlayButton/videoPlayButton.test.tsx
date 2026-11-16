/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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
import type {ReactElement, ReactNode} from 'react';

import {ThemeProvider} from '../../../../../../../../../../uiKit/identity/theme/theme';
import {VideoPlayButton} from './videoPlayButton';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../../../../../../../page/testSupport/rootContextTestSupport';
import {translateForTest} from '../../../../../../../../../../util/test/translateForTest';

describe('VideoPlayButton', () => {
  const RootWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));
  const wrapper = ({children}: {children: ReactNode}): ReactElement => {
    return (
      <ThemeProvider>
        <RootWrapper>{children}</RootWrapper>
      </ThemeProvider>
    );
  };

  it('does not throw when the media element ref has been detached (null)', () => {
    const detachedElement = null as unknown as HTMLMediaElement;

    expect(() => {
      return render(
        <VideoPlayButton mediaElement={detachedElement} isPlaying={false} onPlay={jest.fn()} onPause={jest.fn()} />,
        {
          wrapper,
        },
      );
    }).not.toThrow();
  });

  it('subscribes to playing and pause events of an attached media element', () => {
    const mediaElement = document.createElement('video');
    const addSpy = jest.spyOn(mediaElement, 'addEventListener');

    render(<VideoPlayButton mediaElement={mediaElement} isPlaying={false} onPlay={jest.fn()} onPause={jest.fn()} />, {
      wrapper,
    });

    expect(addSpy).toHaveBeenCalledWith('playing', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('pause', expect.any(Function));
  });
});
