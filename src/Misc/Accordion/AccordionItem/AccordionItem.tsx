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

import {ElementRef, forwardRef, ReactNode} from 'react';

import * as AccordionPrimitive from '@radix-ui/react-accordion';

import {
  chevronStyles,
  contentStyles,
  contentTextStyles,
  itemStyles,
  triggerStyles,
  triggerTextStyles,
} from './AccordionItem.styles';

import {ChevronDownIcon} from '../../../Icon';

interface AccordionItemProps {
  title: string;
  children: ReactNode;
  value: string;
}

export const AccordionItem = forwardRef<ElementRef<typeof AccordionPrimitive.Item>, AccordionItemProps>(
  ({title, children, value}, ref) => (
    <AccordionPrimitive.Item value={value} ref={ref} css={itemStyles}>
      <AccordionPrimitive.Trigger css={triggerStyles}>
        <span css={triggerTextStyles}>{title}</span>
        <ChevronDownIcon css={chevronStyles} />
      </AccordionPrimitive.Trigger>
      <AccordionPrimitive.Content css={contentStyles}>
        <div css={contentTextStyles}>{children}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  ),
);

AccordionItem.displayName = 'AccordionItem';
