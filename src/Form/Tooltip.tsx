/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {HTMLProps, MouseEvent, FocusEvent, ReactNode, useRef, useState} from 'react';

import {CSSObject} from '@emotion/react';
import {createPortal} from 'react-dom';

import {Theme} from '../Layout';
import {filterProps} from '../util';

const paddingTop = 6;

const tooltipStyle: (theme: Theme) => CSSObject = theme => ({
  position: 'absolute',
  zIndex: '99999',
  maxWidth: '300px',
  filter: 'drop-shadow(1px 2px 6px rgba(0, 0, 0, 0.3))',
  borderRadius: '4px',
  '.tooltip-content': {
    color: theme.Tooltip.color,
    backgroundColor: theme.Tooltip.backgroundColor,
    fontSize: '12px',
    lineHeight: '14px',
    fontWeight: 400,
    padding: `${paddingTop}px 8px`,
    textAlign: 'center',
  },
  '.tooltip-arrow': {
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    position: 'absolute',

    "&[data-position='top']": {
      borderTop: `10px solid ${theme.Tooltip.backgroundColor}`,
      bottom: '-6px',
    },
    "&[data-position='bottom']": {
      borderBottom: `10px solid ${theme.Tooltip.backgroundColor}`,
      top: '-6px',
    },
  },
});

interface PortalProps {
  children: ReactNode;
  bounding?: DOMRect;
  selector?: string;
}

const PortalComponent = ({children, bounding, selector = '#wire-app'}: PortalProps) => {
  const [isTouchingTop, setIsTouchingTop] = useState(false);
  const targetElement = document.querySelector(selector);

  if (!targetElement) {
    return null;
  }

  const tooltipRef = (element: HTMLDivElement) => {
    if (!bounding || !element) {
      return;
    }

    const isTouchingTopEdge = bounding.y <= element.clientHeight + paddingTop * 2;
    setIsTouchingTop(isTouchingTopEdge);

    const elementWidth = (element.scrollWidth - bounding.width) / 2;
    element.style.left = `${bounding.x - elementWidth}px`;

    if (isTouchingTopEdge) {
      element.style.top = `${bounding.y + bounding.height + paddingTop}px`;
    } else {
      element.style.top = `${bounding.y - element.clientHeight - paddingTop}px`;
    }
  };

  const tooltipArrowRef = (element: HTMLDivElement) => {
    if (!element) {
      return;
    }

    const {parentElement} = element;

    if (!parentElement) {
      return;
    }

    const parentElementRect = parentElement.getBoundingClientRect();
    element.style.left = `${parentElementRect.width / 2 - paddingTop}px`;
  };

  return createPortal(
    <div ref={tooltipRef} className="tooltip" css={(theme: Theme) => tooltipStyle(theme)}>
      <div ref={tooltipArrowRef} className="tooltip-arrow" data-position={isTouchingTop ? 'bottom' : 'top'} />

      <div className="tooltip-content" data-testid="tooltip-content">
        {children}
      </div>
    </div>,
    targetElement,
  );
};

interface TooltipProps<T = HTMLDivElement> extends HTMLProps<T> {
  body: ReactNode;
  selector?: string;
}

const filterTooltipProps = (props: TooltipProps) => filterProps(props, ['body']);

export const Tooltip = ({children, ...props}: TooltipProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const boundingRectRef = useRef<DOMRect>();
  const filteredProps = filterTooltipProps(props);
  const {body, selector = '#wire-app'} = props;

  const onElementEnter = (event: MouseEvent | FocusEvent) => {
    const boundingRect = (event.target as Element).getBoundingClientRect();
    setIsHovered(true);
    boundingRectRef.current = boundingRect;
  };

  const onElementLeave = () => setIsHovered(false);

  return (
    <div
      role="presentation"
      {...filteredProps}
      data-testid="tooltip-wrapper"
      onMouseEnter={onElementEnter}
      onMouseLeave={onElementLeave}
      onFocus={onElementEnter}
      onBlur={onElementLeave}
      {...props}
    >
      {children}
      {isHovered && (
        <PortalComponent bounding={boundingRectRef.current} selector={selector}>
          {body}
        </PortalComponent>
      )}
    </div>
  );
};
