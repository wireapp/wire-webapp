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

import React, {HTMLProps, RefObject, useEffect, useRef, useState} from 'react';

import {CSSObject} from '@emotion/react';

import {containerStyle, imageStyle} from './ZoomableImage.style';

import {isHTMLImageElement} from '../../guards/HTMLElement';

type Offset = {
  x: number;
  y: number;
};

const DEFAULT_OFFSET: Offset = {x: 0, y: 0};

function calculateZoomRatio(element: HTMLImageElement) {
  const parentElement = element.parentElement;

  if (!parentElement) {
    return 1;
  }

  const {offsetWidth: parentOffsetWidth, offsetHeight: parentOffsetHeight} = parentElement;
  const {naturalWidth, naturalHeight} = element;

  const widthRatio = parentOffsetWidth / naturalWidth;
  const heightRatio = parentOffsetHeight / naturalHeight;
  return Math.min(widthRatio, heightRatio);
}

// if we will add more image zooming, we need to pass 2 props, for check if is image is zoomed and imageScale
function calculateMaxOffset(containerRef: RefObject<HTMLDivElement>, imgRef: RefObject<HTMLImageElement>) {
  if (!containerRef.current || !imgRef.current) {
    return {
      maxXOffset: 0,
      maxYOffset: 0,
    };
  }

  const containerRect = containerRef.current.getBoundingClientRect();

  return {
    maxXOffset:
      imgRef.current.naturalWidth >= containerRect.width ? (containerRect.width - imgRef.current.naturalWidth) / 2 : 0,
    maxYOffset:
      imgRef.current.naturalHeight >= containerRect.height
        ? (containerRect.height - imgRef.current.naturalHeight) / 2
        : 0,
  };
}

type ZoomableImageProps = {imageCSS?: CSSObject} & HTMLProps<HTMLImageElement>;

export const ZoomableImage = (props: ZoomableImageProps) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imageRatio, setImageRatio] = useState(1);

  const draggingRef = useRef(false);
  const mouseDownRef = useRef(false);

  const [isZoomEnabled, setIsZoomEnabled] = useState<boolean>(false);

  const [translateOffset, setTranslateOffset] = useState<Offset>(DEFAULT_OFFSET);
  const [startOffset, setStartOffset] = useState<Offset>(DEFAULT_OFFSET);

  const canZoomImage = imageRatio !== 1;
  const zoomScale = isZoomEnabled ? 1 : imageRatio;

  const handleMouseClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const element = event.target;

    if (!isHTMLImageElement(element)) {
      return;
    }

    if (!canZoomImage && !isZoomEnabled) {
      return;
    }

    if (draggingRef.current) {
      draggingRef.current = false;
      return;
    }

    if (isZoomEnabled) {
      setStartOffset(DEFAULT_OFFSET);
      setTranslateOffset(DEFAULT_OFFSET);
      draggingRef.current = false;

      setTimeout(() => {
        requestAnimationFrame(() => {
          element.style.transition = '';
        });
      }, 300);
    }

    requestAnimationFrame(() => {
      element.style.transition = 'transform 0.2s';
      element.style.cursor = isZoomEnabled ? 'zoom-in' : 'zoom-out';
    });

    if (!draggingRef.current && !isZoomEnabled) {
      if (!imageRef.current) {
        return;
      }

      const {maxXOffset, maxYOffset} = calculateMaxOffset(containerRef, imageRef);

      const imageRect = imageRef.current.getBoundingClientRect();
      const imageCenterY = imageRef.current.naturalHeight / 2;
      const imageCenterX = imageRef.current.naturalWidth / 2;
      const currentPosX = (event.clientX - imageRect.left) / imageRatio - imageCenterX;
      const currentPosY = (event.clientY - imageRect.top) / imageRatio - imageCenterY;

      setTranslateOffset({
        x: Math.max(maxXOffset, Math.min(-currentPosX, -maxXOffset)),
        y: Math.max(maxYOffset, Math.min(-currentPosY, -maxYOffset)),
      });
    }

    setIsZoomEnabled(prevState => !prevState);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!canZoomImage && !isZoomEnabled) {
      return;
    }
    const element = event.target;

    if (!isHTMLImageElement(element)) {
      return;
    }

    if (isZoomEnabled) {
      mouseDownRef.current = true;
    }

    requestAnimationFrame(() => {
      element.style.transition = 'transform 0.2s';
    });

    setStartOffset({
      x: event.clientX - translateOffset.x,
      y: event.clientY - translateOffset.y,
    });

    event.preventDefault();
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomEnabled && !mouseDownRef.current) {
      return;
    }

    const element = event.target;

    if (!isHTMLImageElement(element)) {
      return;
    }

    mouseDownRef.current = false;

    requestAnimationFrame(() => {
      element.style.cursor = 'zoom-out';
    });
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomEnabled || !mouseDownRef.current || !containerRef.current || !imageRef.current) {
      return;
    }

    const element = event.target;

    if (!isHTMLImageElement(element)) {
      return;
    }

    draggingRef.current = true;

    if (element.style.transition) {
      element.style.transition = '';
    }

    requestAnimationFrame(() => {
      element.style.cursor = 'grabbing';
    });

    const {maxXOffset, maxYOffset} = calculateMaxOffset(containerRef, imageRef);

    setTranslateOffset({
      x: Math.max(maxXOffset, Math.min(event.clientX - startOffset.x, -maxXOffset)),
      y: Math.max(maxYOffset, Math.min(event.clientY - startOffset.y, -maxYOffset)),
    });

    event.preventDefault();
  };

  const updateZoomRatio = () => {
    if (!imageRef.current) {
      return;
    }

    const zoomRatio = calculateZoomRatio(imageRef.current);
    setImageRatio(zoomRatio > 1 ? 1 : zoomRatio);
  };

  useEffect(() => {
    window.addEventListener('resize', updateZoomRatio);

    return () => {
      window.removeEventListener('resize', updateZoomRatio);
    };
  }, []);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
    <div
      ref={containerRef}
      css={containerStyle}
      onClick={handleMouseClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      <img
        {...props}
        alt={props.alt}
        ref={imageRef}
        css={[imageStyle, props.imageCSS]}
        style={{
          transform: `translate3d(${translateOffset.x}px, ${translateOffset.y}px, 0) scale(${zoomScale}, ${zoomScale})`,
        }}
        onLoad={event => {
          const element = event.target;

          if (!isHTMLImageElement(element)) {
            return;
          }

          const zoomRatio = calculateZoomRatio(element);
          const imageScale = zoomRatio > 1 ? 1 : zoomRatio;
          setImageRatio(imageScale);

          element.width = element.naturalWidth;
          element.height = element.naturalHeight;
          element.style.cursor = zoomRatio < 1 ? 'zoom-in' : '';
        }}
      />
    </div>
  );
};
