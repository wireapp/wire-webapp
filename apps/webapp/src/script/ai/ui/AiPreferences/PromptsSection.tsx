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

// External
import Editor from '@monaco-editor/react';

// Ours
import {useAi} from 'src/script/ai';
import {DEFAULT_FINAL_REPORT_TEMPLATE} from 'src/script/ai/prompts/finalReport.hbs';
import {DEFAULT_SUB_REPORT_TEMPLATE} from 'src/script/ai/prompts/subReport.hbs';
import {useAiSettingsDraftStore} from 'src/script/ai/stores/useAiSettingsDraftStore';
import {getLogger} from 'Util/logger';

import {
  sectionStyle,
  sectionTitleStyle,
  fieldGroupStyle,
  labelStyle,
  buttonPrimaryStyle,
  buttonSecondaryStyle,
  buttonRowStyle,
} from './AiPreferences.styles';
import {
  HBS_XML_LANG_ID,
  THEME_ID,
  EDITOR_OPTIONS,
  setupMonaco,
  editorContainerStyle,
  loadingPlaceholderStyle,
} from './monacoSetup';

const log = getLogger('AI/PromptsSection');

/** AI Preferences section for editing the sub-report and final-report Handlebars prompt templates. */
export const PromptsSection = () => {
  const {prompts} = useAi();
  const {subReportTemplate, finalReportTemplate, setField, isReady} = useAiSettingsDraftStore();

  const handleSaveSubReport = async () => {
    try {
      await prompts.setTemplate('sub_report', subReportTemplate);
    } catch (error) {
      log.error('Failed to save sub_report template', error);
    }
  };

  const handleResetSubReport = async () => {
    try {
      await prompts.resetToDefault('sub_report');
      setField('subReportTemplate', DEFAULT_SUB_REPORT_TEMPLATE);
    } catch (error) {
      log.error('Failed to reset sub_report template', error);
    }
  };

  const handleSaveFinalReport = async () => {
    try {
      await prompts.setTemplate('final_report', finalReportTemplate);
    } catch (error) {
      log.error('Failed to save final_report template', error);
    }
  };

  const handleResetFinalReport = async () => {
    try {
      await prompts.resetToDefault('final_report');
      setField('finalReportTemplate', DEFAULT_FINAL_REPORT_TEMPLATE);
    } catch (error) {
      log.error('Failed to reset final_report template', error);
    }
  };

  return (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>Prompt Templates</div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Sub-report template (Handlebars — runs per conversation)</label>
        <div style={editorContainerStyle}>
          {isReady ? (
            <Editor
              path="ai-pref/sub-report"
              height="380px"
              language={HBS_XML_LANG_ID}
              theme={THEME_ID}
              value={subReportTemplate}
              onChange={value => setField('subReportTemplate', value ?? '')}
              beforeMount={setupMonaco}
              options={EDITOR_OPTIONS}
            />
          ) : (
            <div style={{...loadingPlaceholderStyle, height: '380px'}}>Loading…</div>
          )}
        </div>
        <div style={buttonRowStyle}>
          <button style={buttonPrimaryStyle} onClick={() => void handleSaveSubReport()}>
            Save
          </button>
          <button style={buttonSecondaryStyle} onClick={() => void handleResetSubReport()}>
            Reset to Default
          </button>
        </div>
      </div>

      <div style={{...fieldGroupStyle, marginTop: '24px'}}>
        <label style={labelStyle}>Final report template (Handlebars — runs once after all conversations)</label>
        <div style={editorContainerStyle}>
          {isReady ? (
            <Editor
              path="ai-pref/final-report"
              height="320px"
              language={HBS_XML_LANG_ID}
              theme={THEME_ID}
              value={finalReportTemplate}
              onChange={value => setField('finalReportTemplate', value ?? '')}
              beforeMount={setupMonaco}
              options={EDITOR_OPTIONS}
            />
          ) : (
            <div style={{...loadingPlaceholderStyle, height: '320px'}}>Loading…</div>
          )}
        </div>
        <div style={buttonRowStyle}>
          <button style={buttonPrimaryStyle} onClick={() => void handleSaveFinalReport()}>
            Save
          </button>
          <button style={buttonSecondaryStyle} onClick={() => void handleResetFinalReport()}>
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
};
