/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import React, {HTMLProps, RefObject, useRef, useState} from 'react';

import {imageStyle} from './ZoomableImage.style';

type Offset = {
  x: number;
  y: number;
};

const DEFAULT_OFFSET: Offset = {x: 0, y: 0};

function calculateZoomRatio(parentWidth: number, parentHeight: number, naturalWidth: number, naturalHeight: number) {
  const widthRatio = parentWidth / naturalWidth;
  const heightRatio = parentHeight / naturalHeight;
  return Math.min(widthRatio, heightRatio);
}

function calculateMaxOffset(
  containerRef: RefObject<HTMLDivElement>,
  imgRef: RefObject<HTMLImageElement>,
  zoomScale: number,
) {
  if (!containerRef.current || !imgRef.current) {
    return {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
    };
  }

  const containerRect = containerRef.current.getBoundingClientRect();

  const scaledWidth = imgRef.current.naturalWidth * zoomScale;
  const scaledHeight = imgRef.current.naturalHeight * zoomScale;

  const maxXOffset = (containerRect.width - scaledWidth) / 2;
  const maxYOffset = (containerRect.height - scaledHeight) / 2;

  return {
    minX: maxXOffset,
    maxX: -maxXOffset,
    minY: maxYOffset,
    maxY: -maxYOffset,
  };
}

type ZoomableImageProps = HTMLProps<HTMLImageElement>;

export const ZoomableImage = (props: ZoomableImageProps) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isZoomEnabled, setIsZoomEnabled] = useState<boolean>(false);
  const [imageZoomRatio, setImageZoomRatio] = useState(1);

  const [zoomScale, setZoomScale] = useState(1);
  const [translateOffset, setTranslateOffset] = useState<Offset>(DEFAULT_OFFSET);
  const [startOffset, setStartOffset] = useState<Offset>(DEFAULT_OFFSET);

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const element = event.target as HTMLImageElement;

    if (isDragging) {
      setIsDragging(false);
      return;
    }

    setIsZoomEnabled(prevState => !prevState);
    setZoomScale(prevScale => (prevScale === imageZoomRatio ? 1 : imageZoomRatio));

    requestAnimationFrame(() => {
      element.style.transition = 'transform 0.2s';
      element.style.cursor = isZoomEnabled ? 'zoom-in' : 'zoom-out';
    });

    if (isZoomEnabled) {
      setStartOffset(DEFAULT_OFFSET);
      setTranslateOffset(DEFAULT_OFFSET);
      setIsDragging(false);
    }
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (isZoomEnabled) {
      setIsMouseDown(true);
    }

    setStartOffset({
      x: event.clientX - translateOffset.x,
      y: event.clientY - translateOffset.y,
    });
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomEnabled && !isMouseDown) {
      return;
    }

    setIsMouseDown(false);
    const element = event.target as HTMLImageElement;
    requestAnimationFrame(() => {
      element.style.cursor = 'zoom-out';
    });
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomEnabled || !isMouseDown || !containerRef.current || !imgRef.current) {
      return;
    }

    setIsDragging(true);

    const element = event.target as HTMLImageElement;

    if (element.style.transition) {
      element.style.transition = '';
    }

    requestAnimationFrame(() => {
      element.style.cursor = 'grabbing';
    });

    const {minX, maxX, minY, maxY} = calculateMaxOffset(containerRef, imgRef, zoomScale);

    setTranslateOffset({
      x: Math.max(minX, Math.min(event.clientX - startOffset.x, maxX)),
      y: Math.max(minY, Math.min(event.clientY - startOffset.y, maxY)),
    });

    event.preventDefault();
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
    <div
      css={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
      onClick={handleMouseClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      ref={containerRef}
    >
      <img
        {...props}
        alt={props.alt}
        ref={imgRef}
        css={imageStyle}
        style={{
          transform: `translate3d(${translateOffset.x}px, ${translateOffset.y}px, 0) scale(${zoomScale}, ${zoomScale})`,
          transition: 'transform 0.2s',
        }}
        onLoad={event => {
          const element = event.target as HTMLImageElement;
          const parentElement = element.parentElement;

          if (!parentElement) {
            return;
          }

          const {offsetWidth: parentOffsetWidth, offsetHeight: parentOffsetHeight} = parentElement;
          const zoomRatio = calculateZoomRatio(
            parentOffsetWidth,
            parentOffsetHeight,
            element.naturalWidth,
            element.naturalHeight,
          );

          const imageScale = zoomRatio > 1 ? 1 : zoomRatio;
          element.style.transform = `translate3d(0px, 0px, 0px) scale(${imageScale}, ${imageScale})`;
          setImageZoomRatio(imageScale);
          setZoomScale(imageScale);

          element.width = element.naturalWidth;
          element.height = element.naturalHeight;

          element.style.cursor = zoomRatio < 1 ? 'zoom-in' : '';
        }}
      />
    </div>
  );
};
