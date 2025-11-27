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

import {ElementRef, forwardRef, ForwardRefExoticComponent, ReactNode, RefAttributes} from 'react';

import * as AccordionPrimitive from '@radix-ui/react-accordion';

import {AccordionItem} from './AccordionItem/AccordionItem';
import {wrapperStyles} from './AccordionItem/AccordionItem.styles';

interface AccordionSingleProps {
  type?: 'single';
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  collapsible?: boolean;
}

interface AccordionMultipleProps {
  type: 'multiple';
  defaultValue?: string[];
  value?: string[];
  onValueChange?: (value: string[]) => void;
}

type AccordionProps = {children: ReactNode} & (AccordionSingleProps | AccordionMultipleProps);

interface AccordionComponent extends ForwardRefExoticComponent<AccordionProps & RefAttributes<HTMLDivElement>> {
  Item: typeof AccordionItem;
}

/**
 * A vertically stacked set of interactive headings that each reveal an associated section of content.
 * The Accordion component can be used to create expandable/collapsible sections of content.
 *
 * @example
 * Single open accordion (default)
 * ```tsx
 * <Accordion>
 *   <Accordion.Item title="What is Wire?" value="item-1">
 *     <Text>Wire is a secure messaging platform...</Text>
 *   </Accordion.Item>
 *   <Accordion.Item title="Is Wire secure?" value="item-2">
 *     <Text>Yes, Wire uses end-to-end encryption...</Text>
 *   </Accordion.Item>
 * </Accordion>
 * ```
 *
 * @example
 * Multiple open accordion:
 * ```tsx
 * <Accordion type="multiple">
 *   <Accordion.Item title="What is Wire?" value="item-1">
 *     <Text>Wire is a secure messaging platform</Text>
 *   </Accordion.Item>
 *   <Accordion.Item title="Is Wire secure?" value="item-2">
 *     <Text>Yes, Wire uses end-to-end encryption</Text>
 *   </Accordion.Item>
 * </Accordion>
 * ```
 */
export const Accordion = forwardRef<ElementRef<typeof AccordionPrimitive.Root>, AccordionProps>((props, ref) => {
  if (props.type === 'multiple') {
    return (
      <AccordionPrimitive.Root
        type="multiple"
        defaultValue={props.defaultValue}
        value={props.value}
        onValueChange={props.onValueChange}
        ref={ref}
        css={wrapperStyles}
      >
        {props.children}
      </AccordionPrimitive.Root>
    );
  }

  return (
    <AccordionPrimitive.Root
      type="single"
      defaultValue={props.defaultValue}
      value={props.value}
      onValueChange={props.onValueChange}
      collapsible={true}
      ref={ref}
      css={wrapperStyles}
      {...props}
    >
      {props.children}
    </AccordionPrimitive.Root>
  );
}) as AccordionComponent;

Accordion.displayName = 'Accordion';
Accordion.Item = AccordionItem;
