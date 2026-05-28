/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import React from 'react';

import {useKnownJiraKeys} from 'src/script/ai/jira/useJiraKeysStore';
import {splitTextWithJiraLinks} from 'src/script/ai/jira/jiraLinkify';
import {navigate} from 'src/script/router/Router';
import {generateJiraTicketUrl} from 'src/script/router/routeGenerator';

interface JiraLinkTextProps {
  text: string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Renders plain text with any known Jira ticket IDs (e.g. SW-123) replaced by
 * in-app navigation links that open #/jira/<key>.
 */
export const JiraLinkText = ({text, style, className}: JiraLinkTextProps) => {
  const known_keys = useKnownJiraKeys();
  const chunks = splitTextWithJiraLinks(text, known_keys);

  return (
    <span style={style} className={className}>
      {chunks.map((chunk, index) => {
        if (chunk.type === 'link') {
          return (
            <a
              key={index}
              href={`#/jira/${chunk.key}`}
              className="jira-inline-link"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                navigate(generateJiraTicketUrl(chunk.key));
              }}
            >
              {chunk.key}
            </a>
          );
        }
        return <React.Fragment key={index}>{chunk.content}</React.Fragment>;
      })}
    </span>
  );
};
