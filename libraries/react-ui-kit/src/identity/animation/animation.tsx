/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {HTMLAttributes, HTMLProps, ReactNode, useRef} from 'react';

import {ClassNames} from '@emotion/react';
import type {CSSObject} from '@emotion/react';
import type {CSSTransitionProps} from 'react-transition-group/CSSTransition';

import {DURATION, EASE} from '../motions/motions';

const {CSSTransition, TransitionGroup} = require('react-transition-group');

type TransitionOptions = Partial<
  Pick<
    CSSTransitionProps<HTMLDivElement>,
    | 'appear'
    | 'enter'
    | 'exit'
    | 'in'
    | 'mountOnEnter'
    | 'onEnter'
    | 'onEntered'
    | 'onEntering'
    | 'onExit'
    | 'onExited'
    | 'onExiting'
    | 'timeout'
    | 'unmountOnExit'
  >
>;

type TransitionProps = TransitionOptions &
  Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    animationStyle?: CSSObject;
    children: ReactNode;
  };

type OpacityProps = TransitionProps & {
  endValue?: number;
  startValue?: number;
};

type MovementProps = TransitionProps & {
  endValue?: string;
  startValue?: string;
};

type TransitionContainerProps = HTMLProps<any> & {
  appear?: boolean;
  component?: string;
  enter?: boolean;
  exit?: boolean;
};

export const TransitionContainer = (props: TransitionContainerProps) => <TransitionGroup {...props} />;

export const Transition = ({animationStyle, timeout, children, ...props}: TransitionProps) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  return (
    <ClassNames>
      {({css}) => (
        <CSSTransition {...props} timeout={timeout} nodeRef={nodeRef} classNames={css(animationStyle)}>
          <div ref={nodeRef}>{children}</div>
        </CSSTransition>
      )}
    </ClassNames>
  );
};

export const Opacity = ({startValue = 0, endValue = 1, timeout = DURATION.DEFAULT, ...props}: OpacityProps) => (
  <Transition
    {...props}
    animationStyle={{
      '&-enter': {opacity: startValue},
      '&-enter-active': {
        opacity: endValue,
        transition: `all ${timeout}ms ${EASE.QUART}`,
      },
      '&-exit': {opacity: endValue},
      '&-exit-active': {
        opacity: startValue,
        pointerEvents: 'none',
        transition: `all ${timeout}ms ${EASE.QUART}`,
      },
      '&-exit-done': {opacity: startValue},
    }}
    timeout={timeout}
  />
);

export const YAxisMovement = ({
  startValue = '-100%',
  endValue = '0%',
  timeout = DURATION.DEFAULT,
  ...props
}: MovementProps) => (
  <Transition
    {...props}
    animationStyle={{
      '&-enter': {transform: `translateY(${startValue})`},
      '&-enter-active': {
        transform: `translateY(${endValue})`,
        transition: `all ${timeout}ms ${EASE.EXPONENTIAL}`,
      },
      '&-exit': {transform: `translateY(${endValue})`},
      '&-exit-active': {
        pointerEvents: 'none',
        transform: `translateY(${startValue})`,
        transition: `all ${timeout}ms ${EASE.EXPONENTIAL}`,
      },
      '&-exit-done': {transform: `translateY(${startValue})`},
    }}
    timeout={timeout}
  />
);

export const XAxisMovement = ({
  startValue = '-100%',
  endValue = '0%',
  timeout = DURATION.DEFAULT,
  ...props
}: MovementProps) => (
  <Transition
    {...props}
    animationStyle={{
      '&-enter': {transform: `translateX(${startValue})`},
      '&-enter-active': {
        transform: `translateX(${endValue})`,
        transition: `all ${timeout}ms ${EASE.EXPONENTIAL}`,
      },
      '&-exit': {transform: `translateX(${endValue})`},
      '&-exit-active': {
        pointerEvents: 'none',
        transform: `translateX(${startValue})`,
        transition: `all ${timeout}ms ${EASE.EXPONENTIAL}`,
      },
      '&-exit-done': {transform: `translateX(${startValue})`},
    }}
    timeout={timeout}
  />
);

export const Slide = ({startValue = '-100%', endValue = '0%', timeout = DURATION.DEFAULT, ...props}: MovementProps) => (
  <Transition
    {...props}
    animationStyle={{
      '&-enter': {marginTop: startValue},
      '&-enter-active': {
        marginTop: endValue,
        transition: `all ${timeout}ms ${EASE.QUART}`,
      },
      '&-exit': {marginTop: endValue},
      '&-exit-active': {
        marginTop: startValue,
        pointerEvents: 'none',
        transition: `all ${timeout}ms ${EASE.QUART}`,
      },
      '&-exit-done': {marginTop: startValue},
    }}
    timeout={timeout}
  />
);

export const LeftRightMovement = (props: MovementProps) => (
  <XAxisMovement startValue="-100vh" endValue="0vh" {...props} />
);
export const RightLeftMovement = (props: MovementProps) => (
  <XAxisMovement startValue="100vh" endValue="0vh" {...props} />
);

export const TopDownMovement = (props: MovementProps) => <YAxisMovement startValue="-100%" endValue="0%" {...props} />;
export const BottomUpMovement = (props: MovementProps) => <YAxisMovement startValue="100%" endValue="0%" {...props} />;
