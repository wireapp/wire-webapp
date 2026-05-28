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

import Handlebars from 'handlebars';

import type {DexieDatabase} from 'Repositories/storage/DexieDatabase';

import {DEFAULT_FINAL_REPORT_TEMPLATE} from './finalReport.hbs';
import {DEFAULT_SUB_REPORT_TEMPLATE} from './subReport.hbs';
import {DEFAULT_SUB_REPORT_INCREMENTAL_TEMPLATE} from './subReportIncremental.hbs';

import type {PromptTemplateId} from '../storage/records/AiPromptTemplateRecord';

/** Version of the bundled templates. Increment when the defaults change significantly. */
export const CURRENT_TEMPLATE_VERSION = 1;

const BUNDLED: Record<PromptTemplateId, string> = {
  sub_report: DEFAULT_SUB_REPORT_TEMPLATE,
  sub_report_incremental: DEFAULT_SUB_REPORT_INCREMENTAL_TEMPLATE,
  final_report: DEFAULT_FINAL_REPORT_TEMPLATE,
};

/**
 * Manages Handlebars prompt templates stored in Dexie.
 * Seeds the DB row from the bundled default on first read.
 * Re-compiles on every render() call (D24 / Q&A R1 Q4 — no caching).
 */
export class PromptService {
  constructor(private readonly db: DexieDatabase) {}

  /** Returns the template source for the given id. Seeds from bundled default if not yet stored. */
  async getTemplate(id: PromptTemplateId): Promise<string> {
    const row = await this.db.ai_prompt_templates.get(id);
    if (row) {
      return row.content;
    }

    const bundled = BUNDLED[id];
    await this.db.ai_prompt_templates.put({
      template_id: id,
      content: bundled,
      updated_at: new Date().toISOString(),
      imported_from_default_version: CURRENT_TEMPLATE_VERSION,
    });
    return bundled;
  }

  /** Replaces the stored template for the given id. */
  async setTemplate(id: PromptTemplateId, content: string): Promise<void> {
    await this.db.ai_prompt_templates.put({
      template_id: id,
      content,
      updated_at: new Date().toISOString(),
      imported_from_default_version: CURRENT_TEMPLATE_VERSION,
    });
  }

  /** Overwrites the stored template with the bundled default. */
  async resetToDefault(id: PromptTemplateId): Promise<void> {
    await this.setTemplate(id, BUNDLED[id]);
  }

  /**
   * Renders the template for the given id with the provided variables.
   * Re-compiles the Handlebars template on every call (no caching per D24).
   */
  async render(id: PromptTemplateId, vars: Record<string, unknown>): Promise<string> {
    const source = await this.getTemplate(id);
    const fn = Handlebars.compile(source, {noEscape: false});
    return fn(vars);
  }
}
