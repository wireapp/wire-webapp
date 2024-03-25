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

import {Mention} from './Mention';

type SerializedMentionNode = Spread<
  {
    value: string;
    trigger: string;
  },
  SerializedLexicalNode
>;

function convertElement(domNode: HTMLElement): DOMConversionOutput | null {
  const value = domNode.getAttribute('data-lexical-mention-value');
  const trigger = domNode.getAttribute('data-lexical-mention-trigger');

  if (value !== null && trigger != null) {
    const node = $createMentionNode(trigger, value);
    return {node};
  }

  return null;
}

/**
 * This node is used to represent a mention used in the MentionPlugin.
 */
export class MentionNode extends DecoratorNode<JSX.Element> {
  __value: string;
  __trigger: string;

  static getType() {
    return 'Mention';
  }

  static clone(node: MentionNode) {
    return new MentionNode(node.__trigger, node.__value, node.__key);
  }

  static importJSON(serializedNode: SerializedMentionNode) {
    return $createMentionNode(serializedNode.trigger, serializedNode.value);
  }

  exportDOM() {
    const element = document.createElement('span');
    element.setAttribute('data-lexical-mention', 'true');
    element.setAttribute('data-lexical-mention-trigger', this.__trigger);
    element.setAttribute('data-lexical-mention-value', this.__value);
    element.textContent = this.getTextContent();
    return {element};
  }

  static importDOM() {
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

  constructor(trigger: string, value: string, key?: NodeKey) {
    super(key);
    this.__trigger = trigger;
    this.__value = value;
  }

  exportJSON(): SerializedMentionNode {
    return {
      trigger: this.__trigger,
      value: this.__value,
      type: 'Mention',
      version: 1,
    };
  }

  createDOM() {
    return document.createElement('span');
  }

  getTextContent() {
    return this.__trigger + this.__value;
  }

  updateDOM() {
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

  setValue(value: string) {
    const self = this.getWritable();
    self.__value = value;
  }

  decorate(_editor: LexicalEditor, config: EditorConfig) {
    const theme: Record<string, string> = config.theme.mentions || {};
    const entry = Object.entries(theme).find(([trigger]) => new RegExp(trigger).test(this.__trigger));
    const className = entry && entry[1];
    const classNameFocused = entry && theme[`${entry[0]}Focused`];
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

export function $createMentionNode(trigger: string, value: string): MentionNode {
  const mentionNode = new MentionNode(trigger, value);
  return $applyNodeReplacement(mentionNode);
}

export function $isMentionNode(node: LexicalNode | null | undefined): node is MentionNode {
  return node instanceof MentionNode;
}
