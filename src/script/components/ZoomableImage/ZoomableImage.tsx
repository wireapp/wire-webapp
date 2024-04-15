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

import React, {HTMLProps, useState} from 'react';

import {imageStyle} from './ZoomableImage.style';

function checkIfCanZoomImage(element: HTMLImageElement) {
  if (element.naturalWidth <= element.width && element.naturalHeight <= element.height) {
    return false;
  }

  return element.naturalWidth !== element.offsetWidth || element.naturalHeight !== element.offsetHeight;
}

type ZoomableImageProps = HTMLProps<HTMLImageElement>;

export const ZoomableImage = (props: ZoomableImageProps) => {
  const [isZoomEnabled, setIsZoomEnabled] = useState<boolean>(false);
  const [maxOffset, setMaxOffset] = useState({x: 0, y: 0});

  const onButtonClick = (event: React.MouseEvent<HTMLImageElement>) => {
    const element = event.target as HTMLImageElement;

    if (!checkIfCanZoomImage(element)) {
      setIsZoomEnabled(false);

      if (isZoomEnabled) {
        element.style.width = ``;
        element.style.height = ``;
        element.style.transform = ``;
        return;
      }

      return;
    }

    const {naturalWidth, naturalHeight, offsetWidth, offsetHeight, parentElement} = element;
    const {clientX, clientY} = event;

    setIsZoomEnabled(prevState => !prevState);

    element.style.width = `${naturalWidth}px`;
    element.style.height = `${naturalHeight}px`;

    const {left, top} = element.getBoundingClientRect();

    const parentElementHeight = parentElement?.offsetHeight || offsetHeight;
    const imageCenterX = naturalWidth / 2;
    const imageCenterY = naturalHeight / 2;

    const deltaX = clientX - left;
    const deltaY = clientY - top;

    const isImageNaturalHeightLargerThanHeight = element.naturalHeight >= element.height;
    const isImageNaturalWidthLargerThanWidth = element.naturalWidth > element.width;

    const maxXOffset = isImageNaturalWidthLargerThanWidth ? ((naturalWidth - offsetWidth) / 2 / naturalWidth) * 100 : 0;
    const calculatedYOffset = ((naturalHeight - parentElementHeight) / 2 / naturalHeight) * 100;
    const maxYOffset = isImageNaturalHeightLargerThanHeight ? (calculatedYOffset >= 0 ? calculatedYOffset : 0) : 0;

    setMaxOffset({x: maxXOffset, y: maxYOffset});

    const xOffset = Math.min(Math.max(((deltaX - imageCenterX) / naturalWidth) * 100, -maxXOffset), maxXOffset);
    const yOffset = Math.min(Math.max(((deltaY - imageCenterY) / naturalHeight) * 100, -maxYOffset), maxYOffset);

    element.style.transform = `translate(${-xOffset}%, ${-yOffset}%)`;
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLImageElement>) => {
    if (isZoomEnabled) {
      const element = event.target as HTMLImageElement;

      const {naturalWidth, naturalHeight} = element;
      const {left, top} = element.getBoundingClientRect();

      const mouseX = event.clientX - left;
      const mouseY = event.clientY - top;
      const centerX = naturalWidth / 2;
      const centerY = naturalHeight / 2;

      const {x: maxXOffset, y: maxYOffset} = maxOffset;

      const xOffset = Math.min(Math.max(((mouseX - centerX) / naturalWidth) * 100, -maxXOffset), maxXOffset);
      const yOffset = Math.min(Math.max(((mouseY - centerY) / naturalHeight) * 100, -maxYOffset), maxYOffset);

      element.style.transform = `translate(${-xOffset}%, ${-yOffset}%)`;
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-noninteractive-element-interactions,jsx-a11y/alt-text
    <img
      {...props}
      css={imageStyle(isZoomEnabled)}
      onClick={onButtonClick}
      onMouseMove={handleMouseMove}
      onLoad={event => {
        const element = event.target as HTMLImageElement;

        const isImageWidthTooLarge = element.naturalWidth > element.offsetWidth;
        const isImageHeightTooLarge = element.naturalHeight > element.offsetHeight;

        if (!isImageHeightTooLarge && !isImageWidthTooLarge) {
          return;
        }

        element.style.cursor = checkIfCanZoomImage(element) ? 'zoom-in' : '';
      }}
    />
  );
};
