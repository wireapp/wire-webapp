/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {forwardRef, ReactNode} from 'react';

import {CSSObject} from '@emotion/react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

import {
  contentStyle,
  itemStyle,
  subContentStyle,
  subTriggerStyle,
  textStyles,
  triggerStyles,
} from './DropdownMenu.styles';

/**
 * A dropdown menu component that provides a customizable and accessible dropdown interface.
 * Built on top of accessible primitives, it offers a flexible way to display
 * contextual actions and navigation options.
 *
 * Disclaimer: Custom trigger components (with asChild) must accept id, aria-haspopup, aria-expanded, and data-state props.
 *
 * Example:
 * ```tsx
 * <DropdownMenu>
 *   <DropdownMenu.Trigger>Open Menu</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Item 1</DropdownMenu.Item>
 *     <DropdownMenu.Item>Item 2</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu>
 * ```
 *
 * With custom trigger:
 * ```tsx
 * <DropdownMenu>
 *   <DropdownMenu.Trigger asChild>
 *     <Button>Open Menu</Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Item 1</DropdownMenu.Item>
 *     <DropdownMenu.Item>Item 2</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu>
 * ```
 *
 */
export const DropdownMenu = ({children}: {children: ReactNode}) => {
  return <DropdownMenuPrimitive.Root>{children}</DropdownMenuPrimitive.Root>;
};

const DropdownMenuTrigger = ({
  children,
  asChild = false,
  cssObj,
}: {
  children: ReactNode;
  asChild?: boolean;
  cssObj?: CSSObject;
}) => {
  return (
    <DropdownMenuPrimitive.Trigger asChild={asChild} css={!asChild && {...triggerStyles, ...cssObj}}>
      {children}
    </DropdownMenuPrimitive.Trigger>
  );
};

DropdownMenu.Trigger = DropdownMenuTrigger;

const DropdownMenuContent = ({children}: {children: ReactNode}) => {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content css={contentStyle} sideOffset={6}>
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
};

DropdownMenu.Content = DropdownMenuContent;

const DropdownMenuItem = ({children, onClick}: {children: ReactNode; onClick: () => void}) => {
  return (
    <DropdownMenuPrimitive.Item css={itemStyle} onClick={onClick}>
      <span css={textStyles}>{children}</span>
    </DropdownMenuPrimitive.Item>
  );
};

DropdownMenu.Item = DropdownMenuItem;

const defaultSubmenuIndicator = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.85355 12.1464C5.53857 12.4614 5 12.2383 5 11.7929L5 4.20711C5 3.76165 5.53857 3.53857 5.85355 3.85355L9.64645 7.64645C9.84171 7.84171 9.84171 8.15829 9.64645 8.35355L5.85355 12.1464Z"
      fill="currentColor"
    />
  </svg>
);

const DropdownMenuSubTrigger = forwardRef<
  HTMLDivElement,
  DropdownMenuPrimitive.DropdownMenuSubTriggerProps & {
    cssObj?: CSSObject;
    showIndicator?: boolean;
    indicator?: ReactNode;
  }
>(({children, cssObj, showIndicator = true, indicator, ...props}, ref) => {
  return (
    <DropdownMenuPrimitive.SubTrigger ref={ref} css={{...itemStyle, ...subTriggerStyle, ...cssObj}} {...props}>
      <span css={textStyles}>{children}</span>
      {showIndicator ? (
        <span css={{display: 'inline-flex', flexShrink: 0}}>{indicator ?? defaultSubmenuIndicator}</span>
      ) : null}
    </DropdownMenuPrimitive.SubTrigger>
  );
});

DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

DropdownMenu.SubTrigger = DropdownMenuSubTrigger;

const DropdownMenuSubContent = forwardRef<
  HTMLDivElement,
  DropdownMenuPrimitive.DropdownMenuSubContentProps & {cssObj?: CSSObject}
>(({children, cssObj, ...props}, ref) => {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent ref={ref} css={{...contentStyle, ...subContentStyle, ...cssObj}} {...props}>
        {children}
      </DropdownMenuPrimitive.SubContent>
    </DropdownMenuPrimitive.Portal>
  );
});

DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

DropdownMenu.SubContent = DropdownMenuSubContent;
DropdownMenu.Sub = DropdownMenuPrimitive.Sub;
