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

import {useEffect} from 'react';

import {useAi} from 'src/script/ai';
import {DEFAULT_FINAL_REPORT_TEMPLATE} from 'src/script/ai/prompts/finalReport.hbs';
import {DEFAULT_SUB_REPORT_TEMPLATE} from 'src/script/ai/prompts/subReport.hbs';
import {useAiSettingsDraftStore} from 'src/script/ai/stores/useAiSettingsDraftStore';
import {PreferencesPage} from 'src/script/page/MainContent/panels/preferences/components/PreferencesPage';
import {getLogger} from 'Util/logger';

import {JiraSection} from './JiraSection';
import {JobDescriptionSection} from './JobDescriptionSection';
import {OllamaConnectionSection} from './OllamaConnectionSection';
import {PromptsSection} from './PromptsSection';

const log = getLogger('AI/AiPreferences');

/**
 * AI preferences page. Loads current settings into the draft store on mount,
 * then renders the three settings sections.
 */
export const AiPreferences = () => {
  const {aiSettings, prompts} = useAi();
  const {reset} = useAiSettingsDraftStore();

  useEffect(() => {
    const load = async () => {
      try {
        const [settings, knownModels, subReportTemplate, finalReportTemplate, jiraEmail, jiraPat] = await Promise.all([
          aiSettings.getAll(),
          aiSettings.getKnownModels(),
          prompts.getTemplate('sub_report'),
          prompts.getTemplate('final_report'),
          aiSettings.getJiraEmail(),
          aiSettings.getJiraPat(),
        ]);
        reset({
          ollamaUrl: settings.ollamaUrl,
          ollamaModel: settings.ollamaModel,
          manualContextSize: settings.manualContextSize,
          perMessageTokenCap: settings.perMessageTokenCap,
          safetyMarginPct: settings.safetyMarginPct,
          jobDescription: settings.jobDescription,
          knownModels,
          subReportTemplate,
          finalReportTemplate,
          jiraEmail,
          jiraPat,
        });
      } catch (error) {
        log.error('Failed to load AI settings for preferences page', error);
        // Seed with defaults so the page is still usable
        reset({
          ollamaUrl: 'http://localhost:11434',
          ollamaModel: 'qwen3.6:35b',
          manualContextSize: 32768,
          perMessageTokenCap: 800,
          safetyMarginPct: 0.2,
          jobDescription: '',
          knownModels: [],
          subReportTemplate: DEFAULT_SUB_REPORT_TEMPLATE,
          finalReportTemplate: DEFAULT_FINAL_REPORT_TEMPLATE,
          jiraEmail: '',
          jiraPat: '',
        });
      }
    };

    void load();
  }, [aiSettings, prompts, reset]);

  return (
    <PreferencesPage title="AI">
      <div className="preferences-section">
        <OllamaConnectionSection />
        <JiraSection />
      </div>
      {/* JobDescriptionSection and PromptsSection use Monaco editors that span the full available
          width, so they live outside the 560px-capped preferences-section container. */}
      <div style={{width: '100%'}}>
        <JobDescriptionSection />
        <PromptsSection />
      </div>
    </PreferencesPage>
  );
};
