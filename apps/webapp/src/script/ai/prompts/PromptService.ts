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

import type {PromptTemplateId} from '../storage/records/AiPromptTemplateRecord';

export const CURRENT_TEMPLATE_VERSION = 1;

const BUNDLED: Record<PromptTemplateId, string> = {
  sub_report: DEFAULT_SUB_REPORT_TEMPLATE,
  final_report: DEFAULT_FINAL_REPORT_TEMPLATE,
};

export class PromptService {
  constructor(private readonly db: DexieDatabase) {}

  /**
   * Returns the stored template content, seeding the Dexie row from the bundled default on first access.
   */
  async getTemplate(id: PromptTemplateId): Promise<string> {
    const row = await this.db.ai_prompt_templates.get(id);
    if (row) {
      return row.content;
    }
    const bundled = BUNDLED[id];
    const updated_at = new Date().toISOString();
    await this.db.ai_prompt_templates.put({
      template_id: id,
      content: bundled,
      updated_at,
      imported_from_default_version: CURRENT_TEMPLATE_VERSION,
    });
    return bundled;
  }

  /**
   * Persists a template. Sets `imported_from_default_version` to `CURRENT_TEMPLATE_VERSION` unconditionally.
   */
  async setTemplate(id: PromptTemplateId, content: string): Promise<void> {
    const updated_at = new Date().toISOString();
    await this.db.ai_prompt_templates.put({
      template_id: id,
      content,
      updated_at,
      imported_from_default_version: CURRENT_TEMPLATE_VERSION,
    });
  }

  /**
   * Overwrites the stored template with the bundled default string and updates `imported_from_default_version`.
   */
  async resetToDefault(id: PromptTemplateId): Promise<void> {
    await this.setTemplate(id, BUNDLED[id]);
  }

  /** Re-compiles from source on every call (Q&A R1 Q4 / D24). */
  async render(id: PromptTemplateId, vars: Record<string, unknown>): Promise<string> {
    const source = await this.getTemplate(id);
    const fn = Handlebars.compile(source, {noEscape: false});
    return fn(vars);
  }
}
