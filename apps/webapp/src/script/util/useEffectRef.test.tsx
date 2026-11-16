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

import {render, screen} from '@testing-library/react';
import type {ReactElement} from 'react';

import {useEffectRef} from './useEffectRef';

const VideoRefHost = ({showVideo}: {showVideo: boolean}): ReactElement => {
  const [videoElement, setVideoElement] = useEffectRef<HTMLVideoElement>();

  return (
    <>
      {showVideo && <video ref={setVideoElement} />}
      <span>{videoElement === undefined ? 'detached' : 'attached'}</span>
    </>
  );
};

describe('useEffectRef', () => {
  it('clears the element when React detaches the ref', () => {
    const {container, rerender} = render(<VideoRefHost showVideo />);

    expect(screen.getByText('attached')).toBeInTheDocument();

    rerender(<VideoRefHost showVideo={false} />);

    expect(container.querySelector('video')).not.toBeInTheDocument();
    expect(screen.getByText('detached')).toBeInTheDocument();
  });
});
