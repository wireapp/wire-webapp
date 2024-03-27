/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

// https://github.com/facebook/react/issues/11163#issuecomment-628379291

import {VideoHTMLAttributes, useEffect, useRef} from 'react';

import {applyBlur} from 'Util/applyBlur';

type VideoProps = VideoHTMLAttributes<HTMLVideoElement> & {
  srcObject: MediaStream;
  blur: boolean;
  handleBlur?: (stream: MediaStream, stopTracks: boolean) => void;
};

const Video = ({srcObject, blur, handleBlur, ...props}: VideoProps) => {
  const refVideo = useRef<HTMLVideoElement>(null);
  const blurRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!refVideo.current) {
      return;
    }
    refVideo.current.srcObject = srcObject;
  }, [srcObject]);

  useEffect(
    () => () => {
      if (blurRef.current) {
        blurRef.current.srcObject = null;
      }
      if (refVideo.current) {
        refVideo.current.srcObject = null;
      }
    },
    [],
  );

  useEffect(() => {
    const asyncBlur = async () => {
      if (!refVideo.current) {
        throw new Error('No ref video');
      }
      return await applyBlur(refVideo.current, props);
    };

    if (blur) {
      asyncBlur()
        .then(stream => {
          if (!stream) {
            throw new Error('Failed to apply blur');
          }
          // handleBlur?.(stream, false);
          blurRef.current!.srcObject = stream;
        })
        .catch(console.error);
    }
  }, [blur, handleBlur, props]);

  return (
    <>
      <video
        ref={refVideo}
        {...props}
        // css={{visibility: blur ? 'hidden' : 'visible', display: blur ? 'none' : 'inline block'}}
      />
      <video
        ref={blurRef}
        {...props}
        // css={{visibility: !blur ? 'hidden' : 'visible', display: !blur ? 'none' : 'inline block'}}
      />
    </>
  );
};

export {Video};
