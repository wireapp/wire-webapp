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

import {useCallback} from 'react';

import {useAi} from 'src/script/ai';

export interface UseJiraFixResult {
  fixTitle:      (key: string, currentSummary: string, area: string, product: string) => Promise<void>;
  fixStoryPoints: (key: string, points: number) => Promise<void>;
  addComment:    (key: string, text: string) => Promise<void>;
}

/**
 * Provides one-click fix functions for Jira rule violations.
 * Calls the Jira REST API, then runs onComplete (typically a full re-sync)
 * so the local DB and UI reflect the change.
 */
export const useJiraFix = (onComplete: () => Promise<void>): UseJiraFixResult => {
  const {aiSettings} = useAi();

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const [email, pat] = await Promise.all([aiSettings.getJiraEmail(), aiSettings.getJiraPat()]);
    if (!email || !pat) throw new Error('Jira credentials not configured');
    return {
      'X-Jira-Email':  email,
      'X-Jira-Token':  pat,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
    };
  }, [aiSettings]);

  const patchIssue = useCallback(async (key: string, fields: Record<string, unknown>): Promise<void> => {
    const headers = await authHeaders();
    const res = await fetch(`/proxy/jira/rest/api/3/issue/${key}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({fields}),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Jira ${res.status}: ${text.slice(0, 120)}`);
    }
  }, [authHeaders]);

  const fixTitle = useCallback(async (
    key: string,
    currentSummary: string,
    area: string,
    product: string,
  ): Promise<void> => {
    // Strip any existing leading bracket groups and optional " - " separator to isolate the topic
    const topic      = currentSummary.replace(/^(\[[^\]]*\])+\s*-?\s*/, '').trim();
    const newSummary = `[${area}][${product}] - ${topic}`;
    await patchIssue(key, {summary: newSummary});
    await onComplete();
  }, [patchIssue, onComplete]);

  const fixStoryPoints = useCallback(async (key: string, points: number): Promise<void> => {
    // customfield_10004 is the Jira story points field
    await patchIssue(key, {customfield_10004: points});
    await onComplete();
  }, [patchIssue, onComplete]);

  const addComment = useCallback(async (key: string, text: string): Promise<void> => {
    const headers = await authHeaders();
    const res = await fetch(`/proxy/jira/rest/api/3/issue/${key}/comment`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({
        body: {
          type:    'doc',
          version: 1,
          content: [{
            type:    'paragraph',
            content: [{type: 'text', text}],
          }],
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Jira ${res.status}: ${body.slice(0, 120)}`);
    }
    await onComplete();
  }, [authHeaders, onComplete]);

  return {fixTitle, fixStoryPoints, addComment};
};
