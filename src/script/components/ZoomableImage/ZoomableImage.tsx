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

import React, {HTMLProps, useRef, useState} from 'react';

import cx from 'classnames';

const ZOOM_IMAGE_SCALE = 3;

type ZoomableImageProps = HTMLProps<HTMLImageElement>;

export const ZoomableImage = (props: ZoomableImageProps) => {
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [isZoomEnabled, setIsZoomEnabled] = useState<boolean>(false);
  const [maxOffset, setMaxOffset] = useState({x: 0, y: 0});

  const onButtonClick = (event: React.MouseEvent<HTMLElement>) => {
    setIsZoomEnabled(prevState => !prevState);

    const element = event.target as HTMLElement;

    if (isZoomEnabled) {
      element.style.transform = `scale(1) translate(0%, 0%)`;
      element.style.transition = '';
      return;
    }

    if (!element.parentElement) {
      return;
    }

    const parentRect = element.parentElement.getBoundingClientRect();
    const mouseX = event.clientX - parentRect.left;
    const mouseY = event.clientY - parentRect.top;

    const imageCenterX = element.offsetWidth / 2;
    const imageCenterY = element.offsetHeight / 2;

    const maxXOffset = Math.max((parentRect.width / (parentRect.width * ZOOM_IMAGE_SCALE)) * 100);
    const maxYOffset = Math.max((parentRect.height / (parentRect.height * ZOOM_IMAGE_SCALE)) * 100);

    setMaxOffset({x: maxXOffset, y: maxYOffset});

    const xOffset = Math.min(
      Math.max(((mouseX - imageCenterX) / parentRect.width) * (ZOOM_IMAGE_SCALE - 1) * 100, -maxXOffset),
      maxXOffset,
    );

    const yOffset = Math.min(
      Math.max(((mouseY - imageCenterY) / parentRect.height) * (ZOOM_IMAGE_SCALE - 1) * 100, -maxYOffset),
      maxYOffset,
    );

    element.style.transition = 'transform 0.3s ease';
    element.style.transform = `scale(${ZOOM_IMAGE_SCALE}) translate(${xOffset}%, ${yOffset}%)`;
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLImageElement>) => {
    if (isZoomEnabled) {
      const element = event.target as HTMLElement;

      if (!element.parentElement) {
        return;
      }

      const parentRect = element.parentElement.getBoundingClientRect();

      const mouseX = event.clientX - parentRect.left;
      const mouseY = event.clientY - parentRect.top;
      const centerX = parentRect.width / 2;
      const centerY = parentRect.height / 2;

      const {x: maxXOffset, y: maxYOffset} = maxOffset;

      const xOffset = Math.min(
        Math.max(((mouseX - centerX) / parentRect.width) * (ZOOM_IMAGE_SCALE - 1) * 100, -maxXOffset),
        maxXOffset,
      );

      const yOffset = Math.min(
        Math.max(((mouseY - centerY) / parentRect.height) * (ZOOM_IMAGE_SCALE - 1) * 100, -maxYOffset),
        maxYOffset,
      );

      element.style.transform = `scale(${ZOOM_IMAGE_SCALE}) translate(${-xOffset}%, ${-yOffset}%)`;
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-noninteractive-element-interactions,jsx-a11y/alt-text
    <img
      {...props}
      ref={imageRef}
      onClick={onButtonClick}
      onMouseMove={handleMouseMove}
      className={cx(props.className, {zoomed: isZoomEnabled})}
    />
  );
};
