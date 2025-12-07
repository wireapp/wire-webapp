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

type VideoProps = VideoHTMLAttributes<HTMLVideoElement> & {
  srcObject: MediaStream;
};

const Video = ({srcObject, ...props}: VideoProps) => {
  const refVideo = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!refVideo.current) {
      return;
    }
    refVideo.current.srcObject = srcObject;
  }, [srcObject]);

  useEffect(
    () => () => {
      if (refVideo.current) {
        refVideo.current.srcObject = null;
      }
    },
    [],
  );

  return <video ref={refVideo} {...props} />;
};

export {Video};
