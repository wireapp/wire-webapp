/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import * as React from 'react';

export interface ChildrenProps<T extends Element, P extends React.HTMLProps<T>> {
  children: React.ReactNode;
  defaultProps: P;
}

export const childrenWithDefaultProps = <E extends Element, P extends any>(props: ChildrenProps<E, P>) =>
  React.Children.map<React.ReactNode, React.ReactNode>(props.children, node => {
    if (typeof node === 'string') {
      return node;
    }
    if (!React.isValidElement<P>(node)) {
      console.error('Invalid children', node);
      return node;
    }

    const elementChild: React.ReactElement<P> = node;
    return React.cloneElement<P>(elementChild, {...(props.defaultProps as any), ...(elementChild.props as any)});
  });
