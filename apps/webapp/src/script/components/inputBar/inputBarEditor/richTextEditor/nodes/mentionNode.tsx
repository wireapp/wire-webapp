/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {ReactElement} from 'react';

import type {JSX} from '@emotion/react/jsx-runtime';
import {
  SerializedLexicalNode,
  Spread,
  $applyNodeReplacement,
  DecoratorNode,
  LexicalEditor,
  type DOMConversionOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
} from 'lexical';

import {Mention} from './mention';

type SerializedMentionNode = Spread<
  {
    value: string;
    trigger: string;
    /** `true` when the mention targets everyone in the conversation (`@all`). Absent in drafts saved before it existed. */
    everyone?: boolean;
  },
  SerializedLexicalNode
>;

function convertElement(domNode: HTMLElement): DOMConversionOutput | null {
  const value = domNode.getAttribute('data-lexical-mention-value');
  const trigger = domNode.getAttribute('data-lexical-mention-trigger');
  const isEveryone = domNode.getAttribute('data-lexical-mention-everyone') === 'true';

  if (value !== null && trigger != null) {
    const node = $createMentionNode(trigger, value, isEveryone);
    return {node};
  }

  return null;
}

/**
 * This node is used to represent a mention used in the MentionPlugin.
 */
type ExportDOMResult = {element: HTMLSpanElement};

type ImportDOMResult = {
  span: (
    domNode: HTMLElement,
  ) => {conversion: (domNode: HTMLElement) => DOMConversionOutput | null; priority: 0} | null;
};
export class MentionNode extends DecoratorNode<ReactElement> {
  __value: string;
  __trigger: string;
  __everyone: boolean;

  static getType(): string {
    return 'Mention';
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__trigger, node.__value, node.__everyone, node.__key);
  }

  static importJSON(serializedNode: SerializedMentionNode): MentionNode {
    return $createMentionNode(serializedNode.trigger, serializedNode.value, serializedNode.everyone === true);
  }

  exportDOM(): ExportDOMResult {
    const element = document.createElement('span');
    element.setAttribute('data-lexical-mention', 'true');
    element.setAttribute('data-lexical-mention-trigger', this.__trigger);
    element.setAttribute('data-lexical-mention-value', this.__value);
    if (this.__everyone) {
      element.setAttribute('data-lexical-mention-everyone', 'true');
    }
    element.textContent = this.getTextContent();
    return {element};
  }

  static importDOM(): ImportDOMResult {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-mention')) {
          return null;
        }
        return {
          conversion: convertElement,
          priority: 0 as const,
        };
      },
    };
  }

  constructor(trigger: string, value: string, everyone = false, key?: NodeKey) {
    super(key);
    this.__trigger = trigger;
    this.__value = value;
    this.__everyone = everyone;
  }

  exportJSON(): SerializedMentionNode {
    return {
      trigger: this.__trigger,
      value: this.__value,
      ...(this.__everyone ? {everyone: true} : {}),
      type: 'Mention',
      version: 1,
    };
  }

  createDOM(): HTMLSpanElement {
    return document.createElement('span');
  }

  getTextContent(): string {
    return this.__trigger + this.__value;
  }

  updateDOM(): boolean {
    return false;
  }

  getTrigger(): string {
    const self = this.getLatest();
    return self.__trigger;
  }

  getValue(): string {
    const self = this.getLatest();
    return self.__value;
  }

  /**
   * @returns `true` when the mention targets everyone in the conversation (`@all`) rather than a single user
   */
  isEveryone(): boolean {
    const self = this.getLatest();
    return self.__everyone;
  }

  setValue(value: string): void {
    const self = this.getWritable();
    self.__value = value;
  }

  decorate(_editor: LexicalEditor, config: EditorConfig): JSX.Element {
    const themeMentions = config.theme.mentions;
    const theme: Record<string, string> =
      typeof themeMentions === 'object' && themeMentions !== null ? themeMentions : {};
    const entry = Object.entries(theme).find(([trigger]) => {
      return new RegExp(trigger).test(this.__trigger);
    });
    const className = entry !== undefined ? entry[1] : undefined;
    const classNameFocused = entry !== undefined ? theme[`${entry[0]}Focused`] : undefined;
    return (
      <Mention
        nodeKey={this.getKey()}
        mention={this.getTextContent()}
        className={className}
        classNameFocused={classNameFocused}
      />
    );
  }
}

export function $createMentionNode(trigger: string, value: string, everyone = false): MentionNode {
  const mentionNode = new MentionNode(trigger, value, everyone);
  return $applyNodeReplacement(mentionNode);
}

export function $isMentionNode(node: LexicalNode | null | undefined): node is MentionNode {
  return node instanceof MentionNode;
}
