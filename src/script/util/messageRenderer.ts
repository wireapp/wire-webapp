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

import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token';
import {escape} from 'underscore';

import {replaceInRange} from './StringUtil';

import type {MentionEntity} from '../message/MentionEntity';

interface MentionText {
  isSelfMentioned: boolean;
  text: string;
  userId: string;
}

interface MarkdownItWithOptions extends MarkdownIt {
  options: MarkdownIt.Options;
}

// Note: We are using "Underscore.js" to escape HTML in the original message
const markdownit = new MarkdownIt('zero', {
  breaks: true,
  html: false,
  langPrefix: 'lang-',
  linkify: true,
}).enable(['autolink', 'backticks', 'code', 'emphasis', 'escape', 'fence', 'heading', 'link', 'linkify', 'newline']);

const originalFenceRule = markdownit.renderer.rules.fence;

markdownit.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const highlighted = originalFenceRule(tokens, idx, options, env, self);
  tokens[idx].map[1] += 1;
  return highlighted.replace(/\n$/, '');
};

markdownit.renderer.rules.heading_open = () => '<div class="md-heading">';
markdownit.renderer.rules.heading_close = () => '</div>';

markdownit.renderer.rules.softbreak = () => '<br>';
markdownit.renderer.rules.hardbreak = () => '<br>';
markdownit.renderer.rules.paragraph_open = (tokens, idx) => {
  const [position] = tokens[idx].map;
  const previousWithMap = tokens
    .slice(0, idx)
    .reverse()
    .find(({map}) => map?.length);
  const previousPosition = previousWithMap ? previousWithMap.map[1] - 1 : 0;
  const count = position - previousPosition;
  return '<br>'.repeat(Math.max(count, 0));
};
markdownit.renderer.rules.paragraph_close = () => '';

// https://github.com/markdown-it/markdown-it/issues/458#issuecomment-401221267
function modifyMarkdownLinks(markdown: string): string {
  const matches = markdownit.linkify.match(markdown);
  if (!matches || matches.length === 0) {
    return markdown;
  }
  const result = [];
  let prevEndIndex = 0;
  for (const match of matches) {
    const startsWithProto = /^https?:\/\//i.test(match.raw);
    const noStartBracket = match.index === 0 || markdown[match.index - 1] !== '<';
    const noEndBracket = match.lastIndex === markdown.length || markdown[match.lastIndex] !== '>';
    const shouldInsertBrackets = startsWithProto && noStartBracket && noEndBracket;

    result.push(markdown.slice(prevEndIndex, match.index));
    result.push(shouldInsertBrackets ? `<${match.raw}>` : match.raw);
    prevEndIndex = match.lastIndex;
  }
  result.push(markdown.slice(prevEndIndex));
  return result.join('');
}

markdownit.normalizeLinkText = text => text;

export const renderMessage = (message: string, selfId: string, mentionEntities: MentionEntity[] = []) => {
  const createMentionHash = (mention: MentionEntity) => `@@${window.btoa(JSON.stringify(mention)).replace(/=/g, '')}`;
  const renderMention = (mentionData: MentionText) => {
    const elementClasses = mentionData.isSelfMentioned ? ' self-mention' : '';
    const elementAttributes = mentionData.isSelfMentioned
      ? ' data-uie-name="label-self-mention"'
      : ` data-uie-name="label-other-mention" data-user-id="${mentionData.userId}"`;

    const mentionText = mentionData.text.replace(/^@/, '');
    const content = `<span class="mention-at-sign">@</span>${escape(mentionText)}`;
    return `<span class="message-mention${elementClasses}"${elementAttributes}>${content}</span>`;
  };

  const mentionTexts: Record<string, MentionText> = {};

  let mentionlessText = mentionEntities
    .slice()
    // sort mentions to start with the latest mention first (in order not to have to recompute the index every time we modify the original text)
    .sort((mention1, mention2) => mention2.startIndex - mention1.startIndex)
    .reduce((strippedText, mention) => {
      const mentionText = message.slice(mention.startIndex, mention.startIndex + mention.length);
      const mentionKey = createMentionHash(mention);
      mentionTexts[mentionKey] = {
        isSelfMentioned: mention.targetsUser(selfId),
        text: mentionText,
        userId: mention.userId,
      };
      return replaceInRange(strippedText, mentionKey, mention.startIndex, mention.startIndex + mention.length);
    }, message);

  markdownit.set({
    highlight: function (code): string {
      const containsMentions = mentionEntities.some(mention => {
        const hash = createMentionHash(mention);
        return code.includes(hash);
      });
      if (containsMentions) {
        // disable code highlighting if there is a mention in there
        // highlighting will be wrong anyway because this is not valid code
        return code;
      }
      return hljs.highlightAuto(code).value;
    },
  });

  markdownit.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const cleanString = (hashedString: string) =>
      escape(
        Object.entries(mentionTexts).reduce(
          (text, [mentionHash, mention]) => text.replace(mentionHash, mention.text),
          hashedString,
        ),
      );
    const link = tokens[idx];
    const href = cleanString(link.attrGet('href'));
    const isEmail = href.startsWith('mailto:');
    const isWireDeepLink = href.toLowerCase().startsWith('wire://');
    const nextToken = tokens[idx + 1];
    const text = nextToken?.type === 'text' ? nextToken.content : '';

    if (!href || !text.trim()) {
      nextToken.content = '';
      const closeToken = tokens.slice(idx).find(token => token.type === 'link_close');
      closeToken.type = 'text';
      closeToken.content = '';
      return `[${cleanString(text)}](${cleanString(href)})`;
    }
    if (isEmail) {
      link.attrPush(['data-email-link', 'true']);
    } else {
      link.attrPush(['target', '_blank']);
      link.attrPush(['rel', 'nofollow noopener noreferrer']);
    }
    if (!isWireDeepLink && !['autolink', 'linkify'].includes(link.markup)) {
      const title = link.attrGet('title');
      if (title) {
        link.attrSet('title', cleanString(title));
      }
      link.attrSet('href', cleanString(href));
      if (nextToken?.type === 'text') {
        nextToken.content = text;
      }
      link.attrPush(['data-md-link', 'true']);
      link.attrPush(['data-uie-name', 'markdown-link']);
    }
    if (isWireDeepLink) {
      link.attrPush(['data-uie-name', 'wire-deep-link']);
    }
    if (link.markup === 'linkify') {
      nextToken.content = encodeURI(nextToken.content);
    }
    return self.renderToken(tokens, idx, options);
  };
  const originalTokens = markdownit.parse(mentionlessText, {});
  mentionlessText = modifyMarkdownLinks(mentionlessText);
  const modifiedLinksTokens = markdownit.parse(mentionlessText, {});
  const fixCodeTokens = (modifiedTokens: Token[], originalTokens: Token[]) =>
    modifiedTokens.map((modifiedToken, index) => {
      const originalToken = originalTokens[index];
      if (modifiedToken.tag === 'code') {
        return originalToken;
      }
      if (modifiedToken.children) {
        modifiedToken.children = fixCodeTokens(modifiedToken.children, originalToken.children);
      }
      return modifiedToken;
    });
  const fixedTokens = fixCodeTokens(modifiedLinksTokens, originalTokens);
  mentionlessText = markdownit.renderer.render(fixedTokens, (markdownit as MarkdownItWithOptions).options, {});
  // Remove <br> and \n if it is the last thing in a message
  mentionlessText = mentionlessText.replace(/(<br>|\n)*$/, '');

  const parsedText = Object.keys(mentionTexts).reduce((text, mentionHash) => {
    const mentionMarkup = renderMention(mentionTexts[mentionHash]);

    return text.replace(mentionHash, mentionMarkup);
  }, mentionlessText);
  return parsedText;
};

export const getRenderedTextContent = (text: string): string => {
  const renderedMessage = renderMessage(text, '');
  const messageWithLinebreaks = renderedMessage.replace(/<br>/g, '\n');
  const strippedMessage = messageWithLinebreaks.replace(/<.+?>/g, '');
  return markdownit.utils.unescapeAll(strippedMessage);
};
