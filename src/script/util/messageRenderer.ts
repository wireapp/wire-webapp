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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import MarkdownIt from 'markdown-it';
import {escape} from 'underscore';

import {highlightCode, languages} from './highlightCode';
import {replaceInRange} from './StringUtil';

import type {MentionEntity} from '../message/MentionEntity';

interface MentionText {
  domain: string | null | undefined;
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
}).enable([
  'autolink',
  'backticks',
  'code',
  'emphasis',
  'escape',
  'fence',
  'heading',
  'link',
  'linkify',
  'newline',
  'list',
  'strikethrough',
  'blockquote',
]);

markdownit.linkify.add('wire:', {
  validate: (text, pos) => {
    // Typical linkify schema: valid url chars to first whitespace or control char
    const tail = text.slice(pos);

    // A simple matcher: up to the first space, <, or a parenthesis.
    const match = /^[^\s<>()]+/.exec(tail);
    if (match) {
      return match[0].length;
    }
    return 0;
  },
  normalize: match => {
    // match.url has the form ‘wire:/...’; replace it with ‘wire://...’ if needed
    if (match.url.startsWith('wire:/') && !match.url.startsWith('wire://')) {
      match.url = match.url.replace('wire:/', 'wire://');
    }
  },
});

const originalFenceRule = markdownit.renderer.rules.fence!;

markdownit.renderer.rules.heading_open = (tokens, idx) => {
  const headingLevel = tokens[idx].tag.slice(1);
  return `<div class="md-heading md-heading--${headingLevel}">`;
};
markdownit.renderer.rules.heading_close = () => '</div>';
const originalNormalizeLink = markdownit.normalizeLink!;

const isValidUrl = (url: string): boolean => {
  // only allow urls to wire://, https://, http:// and mailto:
  return !!url.match(/^(wire:\/\/|https?:\/\/|mailto:)/i);
};
markdownit.validateLink = isValidUrl;
markdownit.normalizeLink = (url: string): string => {
  url = originalNormalizeLink(url);
  if (isValidUrl(url)) {
    return url;
  }
  // prepend "https://" if url does not begin with a protocol or vbscript:, javascript:, file:, data:
  if (!url.match(/^(.*:\/\/|(vbscript|javascript|file|data):)/i)) {
    return `https://${url}`;
  }
  return url;
};

markdownit.renderer.rules.blockquote_open = () => '<blockquote class="md-blockquote">';
markdownit.renderer.rules.blockquote_close = () => '</blockquote>';

markdownit.renderer.rules.softbreak = () => '<br>';
markdownit.renderer.rules.hardbreak = () => '<br>';
markdownit.renderer.rules.paragraph_open = (tokens, idx) => {
  const [position] = tokens[idx].map || [0, 0];

  const previousWithMap = tokens
    .slice(0, idx)
    .reverse()
    .find(({map}) => map?.length);
  const previousPosition = previousWithMap ? (previousWithMap.map || [0, 0])[1] - 1 : 0;
  const count = position - previousPosition;

  const previousToken = tokens[idx - 1];
  const isPreviousTokenList =
    previousToken &&
    (previousToken.type === 'bullet_list_close' ||
      previousToken.type === 'ordered_list_close' ||
      previousToken.type === 'blockquote_close');

  if (isPreviousTokenList) {
    return count > 1 ? `${'<br>'.repeat(count - 1)}` : '';
  }
  return '<br>'.repeat(Math.max(count, 0));
};
markdownit.renderer.rules.paragraph_close = () => '';

const renderMention = (mentionData: MentionText) => {
  const elementClasses = mentionData.isSelfMentioned ? ' self-mention' : '';
  let elementAttributes = mentionData.isSelfMentioned
    ? ' data-uie-name="label-self-mention" role="button"'
    : ` data-uie-name="label-other-mention" data-user-id="${escape(mentionData.userId)}" role="button"`;
  if (!mentionData.isSelfMentioned && mentionData.domain) {
    elementAttributes += ` data-user-domain="${escape(mentionData.domain)}"`;
  }

  const mentionText = mentionData.text.replace(/^@/, '');
  const content = `<span class="mention-at-sign">@</span>${escape(mentionText)}`;
  return `<span class="message-mention${elementClasses}"${elementAttributes}>${content}</span>`;
};

markdownit.normalizeLinkText = text => text;

export const renderMessage = (message: string, selfId?: QualifiedId, mentionEntities: MentionEntity[] = []) => {
  const createMentionHash = (mention: MentionEntity) => `@@${window.btoa(JSON.stringify(mention)).replace(/=/g, '')}`;

  const mentionTexts: Record<string, MentionText> = {};

  let mentionlessText = mentionEntities
    .slice()
    // sort mentions to start with the latest mention first (in order not to have to recompute the index every time we modify the original text)
    .sort((mention1, mention2) => mention2.startIndex - mention1.startIndex)
    .reduce((strippedText, mention) => {
      const mentionText = message.slice(mention.startIndex, mention.startIndex + mention.length);
      const mentionKey = createMentionHash(mention);
      mentionTexts[mentionKey] = {
        domain: mention.domain,
        isSelfMentioned: !!selfId && mention.targetsUser(selfId),
        text: mentionText,
        userId: mention.userId,
      };
      return replaceInRange(strippedText, mentionKey, mention.startIndex, mention.startIndex + mention.length);
    }, message);

  const removeMentionsHashes = (hashedText: string): string => {
    return Object.entries(mentionTexts).reduce(
      (text, [mentionHash, mention]) => text.replace(mentionHash, () => mention.text),
      hashedText,
    );
  };

  const renderMentions = (inputText: string): string => {
    const replacedText = Object.keys(mentionTexts).reduce((text, mentionHash) => {
      const mentionMarkup = renderMention(mentionTexts[mentionHash]);
      return text.replace(mentionHash, () => mentionMarkup);
    }, inputText);
    return replacedText;
  };

  markdownit.renderer.rules.text = (tokens, idx) => {
    const escapedText = markdownit.utils.escapeHtml(tokens[idx].content);

    return renderMentions(escapedText);
  };

  markdownit.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    token.info = removeMentionsHashes(token.info);
    const highlighted = originalFenceRule(tokens, idx, options, env, self);
    (tokens[idx].map ?? [0, 0])[1] += 1;

    const replacedText = renderMentions(highlighted);

    return replacedText.replace(/\n$/, '');
  };

  markdownit.set({
    highlight: function (code, lang): string {
      const containsMentions = mentionEntities.some(mention => {
        const hash = createMentionHash(mention);
        return code.includes(hash);
      });
      if (containsMentions) {
        // disable code highlighting if there is a mention in there
        // highlighting will be wrong anyway because this is not valid code
        return escape(code);
      }

      if (lang && languages[lang]) {
        return highlightCode({code, grammar: languages[lang], lang});
      }

      return highlightCode({code, grammar: languages.javascript, lang: 'javascript'});
    },
  });

  markdownit.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const cleanString = (hashedString: string) => escape(removeMentionsHashes(hashedString));
    const link = tokens[idx];
    const href = removeMentionsHashes(link.attrGet('href') ?? '');
    const isEmail = href.startsWith('mailto:');
    const isWireDeepLink = href.toLowerCase().startsWith('wire://');
    const nextToken = tokens[idx + 1];
    const text = nextToken?.type === 'text' ? nextToken.content : '';
    const closeToken = tokens.slice(idx).find(token => token.type === 'link_close');

    if (href == '' || closeToken == nextToken || (!text.trim() && closeToken == tokens[idx + 2])) {
      if (closeToken) {
        closeToken.type = 'text';
        closeToken.content = `](${cleanString(href)})`;
      }
      return '['; //'${cleanString(text)}`;
    }
    if (isEmail) {
      link.attrPush(['data-email-link', 'true']);
    } else {
      link.attrPush(['target', '_blank']);
      link.attrPush(['rel', 'nofollow noopener noreferrer']);
    }
    link.attrSet('href', href);
    if (!isWireDeepLink && !['autolink', 'linkify'].includes(link.markup)) {
      const title = link.attrGet('title');
      if (title) {
        link.attrSet('title', removeMentionsHashes(title));
      }
      link.attrPush(['data-md-link', 'true']);
      link.attrPush(['data-uie-name', 'markdown-link']);
    }
    if (isWireDeepLink) {
      link.attrPush(['data-uie-name', 'wire-deep-link']);
    }
    if (link.markup === 'linkify') {
      const displayedLink = removeMentionsHashes(nextToken.content);
      if (!href.endsWith(`://${displayedLink}`) && href != displayedLink && href != `mailto:${displayedLink}`) {
        link.attrPush(['data-md-link', 'true']);
        link.attrPush(['data-uie-name', 'markdown-link']);
      }
    }
    return self.renderToken(tokens, idx, options);
  };

  const tokens = markdownit.parse(mentionlessText, {});
  mentionlessText = markdownit.renderer.render(tokens, (markdownit as MarkdownItWithOptions).options, {});
  // Remove <br> and \n if it is the last thing in a message
  mentionlessText = mentionlessText.replace(/(<br>|\n)*$/, '');

  return mentionlessText;
};

export const getRenderedTextContent = (text: string): string => {
  const renderedMessage = renderMessage(text, {domain: '', id: ''});
  const messageWithLinebreaks = renderedMessage.replace(/<br>/g, '\n');
  const strippedMessage = messageWithLinebreaks.replace(/<.+?>/g, '');
  return markdownit.utils.unescapeAll(strippedMessage);
};
