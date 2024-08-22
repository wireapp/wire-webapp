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

const paddingDistance = 8;

const tooltipStyle: (theme: Theme) => CSSObject = theme => ({
  position: 'fixed',
  zIndex: '99999',
  maxWidth: '300px',
  filter: 'drop-shadow(1px 2px 6px rgba(0, 0, 0, 0.3))',
  borderRadius: '4px',

  "&[data-position='top']": {
    paddingBottom: `${paddingDistance}px`,

    '.tooltip-arrow': {
      borderTop: `10px solid ${theme.Tooltip.backgroundColor}`,
      bottom: 0,
    },
  },
  "&[data-position='bottom']": {
    paddingTop: `${paddingDistance}px`,

    '.tooltip-arrow': {
      borderBottom: `10px solid ${theme.Tooltip.backgroundColor}`,
      top: 0,
    },
  },

  '.tooltip-content': {
    color: theme.Tooltip.color,
    backgroundColor: theme.Tooltip.backgroundColor,
    borderRadius: '4px',
    fontSize: '12px',
    lineHeight: '14px',
    fontWeight: 400,
    padding: `${paddingDistance}px 8px`,
    textAlign: 'center',
  },

  '.tooltip-arrow': {
    width: 0,
    height: 0,
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    position: 'absolute',
  },
});

interface TooltipArrowProps {
  wrapperRect: DOMRect;
}

const TooltipArrow = ({wrapperRect}: TooltipArrowProps) => {
  const tooltipArrowRef = (element: HTMLDivElement) => {
    if (!element) {
      return;
    }

    const {parentElement} = element;

    if (!parentElement) {
      return;
    }

    const tooltipRect = parentElement.getBoundingClientRect();

    const isTouchingLeftEdge = wrapperRect.x <= tooltipRect.width / 2 + paddingDistance * 2;
    const isTouchingRightEdge = wrapperRect.left + tooltipRect.width / 2 + paddingDistance * 2 >= window.innerWidth;

    if (isTouchingLeftEdge) {
      element.style.left = `${wrapperRect.left - paddingDistance}px`;
    } else if (isTouchingRightEdge) {
      const calculateX = window.innerWidth - wrapperRect.right - paddingDistance;
      element.style.right = `${calculateX}px`;
    } else {
      element.style.left = `50%`;
      element.style.transform = `translateX(-50%)`;
    }
  };

  return <div ref={tooltipArrowRef} className="tooltip-arrow" />;
};

interface PortalProps {
  children: ReactNode;
  wrapperRect?: DOMRect;
  selector?: string;
}

const PortalComponent = ({children, wrapperRect, selector = '#wire-app'}: PortalProps) => {
  const [isTouchingTop, setIsTouchingTop] = useState(false);
  const targetElement = document.querySelector(selector);

  if (!targetElement || !wrapperRect) {
    return null;
  }

  const tooltipRef = (element: HTMLDivElement) => {
    if (!element) {
      return;
    }

    const tooltipRect = element.getBoundingClientRect();
    const isTouchingTopEdge = wrapperRect.y <= tooltipRect.height + paddingDistance * 2;
    setIsTouchingTop(isTouchingTopEdge);

    const isTouchingLeftEdge = wrapperRect.x <= tooltipRect.width / 2 + paddingDistance * 2;
    const isTouchingRightEdge = wrapperRect.left + tooltipRect.width / 2 + paddingDistance * 2 >= window.innerWidth;

    if (isTouchingLeftEdge) {
      element.style.left = `${paddingDistance}px`;
    } else if (isTouchingRightEdge) {
      element.style.right = `${paddingDistance}px`;
    } else {
      const elementWidth = (element.scrollWidth - wrapperRect.width) / 2;
      element.style.left = `${wrapperRect.x - elementWidth}px`;
    }

    if (isTouchingTopEdge) {
      element.style.top = `${wrapperRect.y + wrapperRect.height}px`;
    } else {
      element.style.top = `${wrapperRect.y - element.clientHeight}px`;
    }
  };

  return createPortal(
    <div
      ref={tooltipRef}
      className="tooltip"
      css={(theme: Theme) => tooltipStyle(theme)}
      data-position={isTouchingTop ? 'bottom' : 'top'}
    >
      <TooltipArrow wrapperRect={wrapperRect} />

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

const filterTooltipProps = (props: TooltipProps) => filterProps(props, ['body', 'selector']);

export const Tooltip = ({children, ...props}: TooltipProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const wrapperRectRef = useRef<DOMRect>();

  const filteredProps = filterTooltipProps(props);
  const {body, selector = '#wire-app'} = props;

  const onElementEnter = ({currentTarget}: MouseEvent | FocusEvent) => {
    const wrapperRect = currentTarget.getBoundingClientRect();
    setIsHovered(true);
    wrapperRectRef.current = wrapperRect;
  };

  const onElementLeave = () => setIsHovered(false);

  return (
    <div
      role="presentation"
      data-testid="tooltip-wrapper"
      onMouseEnter={onElementEnter}
      onMouseLeave={onElementLeave}
      onFocus={onElementEnter}
      onBlur={onElementLeave}
      style={{width: 'max-content'}}
      {...filteredProps}
    >
      {children}

      {isHovered && (
        <PortalComponent wrapperRect={wrapperRectRef.current} selector={selector}>
          {body}
        </PortalComponent>
      )}
    </div>
  );
};
