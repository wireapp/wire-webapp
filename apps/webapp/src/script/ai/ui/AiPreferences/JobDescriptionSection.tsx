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
import {useAiSettingsDraftStore} from 'src/script/ai/stores/useAiSettingsDraftStore';
import {getLogger} from 'Util/logger';

import {
  sectionStyle,
  sectionTitleStyle,
  fieldGroupStyle,
  labelStyle,
  buttonPrimaryStyle,
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

const log = getLogger('AI/JobDescriptionSection');

const JOB_DESC_HEIGHT = '160px';

/** AI Preferences section for the user's job description, injected into prompts for context. */
export const JobDescriptionSection = () => {
  const {aiSettings} = useAi();
  const {jobDescription, setField, isReady} = useAiSettingsDraftStore();

  const handleSave = async () => {
    try {
      await aiSettings.setJobDescription(jobDescription);
    } catch (error) {
      log.error('Failed to save job description', error);
    }
  };

  return (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>Job Description</div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>
          Describe your role and responsibilities. The AI uses this to tailor summaries and action items.
        </label>
        <div style={editorContainerStyle}>
          {isReady ? (
            <Editor
              path="ai-pref/job-description"
              height={JOB_DESC_HEIGHT}
              language={HBS_XML_LANG_ID}
              theme={THEME_ID}
              value={jobDescription}
              onChange={value => setField('jobDescription', value ?? '')}
              beforeMount={setupMonaco}
              options={EDITOR_OPTIONS}
            />
          ) : (
            <div style={{...loadingPlaceholderStyle, height: JOB_DESC_HEIGHT}}>Loading…</div>
          )}
        </div>
      </div>

      <div style={buttonRowStyle}>
        <button style={buttonPrimaryStyle} onClick={() => void handleSave()}>
          Save
        </button>
      </div>
    </div>
  );
};
