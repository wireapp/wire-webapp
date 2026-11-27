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

import {useEffect, useState, type FunctionComponent} from 'react';

import {
  buttonBaseStyles,
  buttonNeutralStyles,
  metricsLabelStyles,
  metricsListStyles,
  metricsRowStyles,
  metricsValueStyles,
  performancePanelCloseButtonStyles,
  performancePanelContainerStyles,
  performancePanelHeaderStyles,
  performancePanelStyles,
  performancePanelTitleStyles,
} from './videoBackgroundPerformancePanel.styles';

import {useApplicationContext} from '../../../../page/rootProvider';
import type {BackgroundEffectsHandler} from '../../../../repositories/media/backgroundEffectsHandler';
import type {QualityMode} from '../../../../repositories/media/backgroundEffectsResolution';
import type {FrameSize} from '../../../../repositories/media/longpipeBackgroundEffects';
import {useBackgroundEffectsStore} from '../../../../repositories/media/useBackgroundEffectsStore';
import {CloseIcon} from '../../../../uiKit/dataDisplay/icon/closeIcon';
import {Select} from '../../../../uiKit/inputs/select/select';

type PerformancePanelProps = {
  backgroundEffectsHandler: BackgroundEffectsHandler;
};

const QUALITY_OPTIONS: readonly QualityMode[] = ['auto', 'fhd', 'hd', 'qhd', 'nhd'];
const POLLING_INTERVAL_MS = 1000;
const qualityOptions = QUALITY_OPTIONS.map(value => {
  return {label: value.toUpperCase(), value};
});

const formatValue = (value: string | number | boolean | null | undefined, unit = ''): string => {
  if (value === null || value === undefined) {
    return '–';
  }
  return `${typeof value === 'number' ? value.toFixed(1) : String(value)}${unit}`;
};

const formatFrameSize = (size: FrameSize | null | undefined): string | null => {
  return size === undefined || size === null ? null : `${size.width} × ${size.height} px`;
};

const MetricsDisplay: FunctionComponent = () => {
  const stats = useBackgroundEffectsStore(state => {
    return state.longpipeStats;
  });
  const frameSizes = useBackgroundEffectsStore(state => {
    return state.frameSizes;
  });
  const fpsDiagnostics = useBackgroundEffectsStore(state => {
    return state.fpsDiagnostics;
  });
  const rows = [
    {
      label: 'Status',
      value: stats?.status,
      description: 'Current pipeline state, such as starting, running, recovering or ended.',
    },
    {
      label: 'Backend',
      value: stats?.backend,
      description: 'Graphics backend used for processing: WebGPU or WebGL2. None means no effects backend is active.',
    },
    {
      label: 'Preset',
      value: stats?.preset,
      description:
        'Current model and processing preset, from xs to xl. Adaptive mode can change it as performance changes.',
    },
    {
      label: 'Input resolution',
      value: formatFrameSize(frameSizes?.input),
      description:
        'Actual input frame dimensions reported by the camera track feeding Longpipe. A dash means the browser does not report the dimensions.',
    },
    {
      label: 'Output resolution',
      value: formatFrameSize(frameSizes?.output),
      description:
        'Actual processed video track dimensions reported by the browser. The displayed preview can keep the same size while the pixel resolution changes. A dash means the browser does not report the dimensions.',
    },
    {
      label: 'Requested output',
      value: formatFrameSize(frameSizes?.requestedOutput),
      description:
        'Pixel dimensions requested when creating the current Longpipe output. Compare with Output resolution to check whether the actual track matches the requested size.',
    },
    {
      label: 'FPS',
      value: stats?.fps,
      description:
        'Frames rendered by Longpipe in the last second. This is separate from camera input FPS and the frame rate sent by AVS.',
    },
    {
      label: 'Input FPS',
      value: stats?.inputFps,
      description:
        'Estimated incoming camera frame rate. Falls back to the input track frame-rate setting when frame counters are unavailable.',
    },
    {
      label: 'Capture FPS request',
      value: fpsDiagnostics?.requestedInputFps,
      description:
        'Frame rate requested by the input track constraints (exact, ideal or max). This request may differ from the actual delivered rate.',
    },
    {
      label: 'Input track FPS',
      value: fpsDiagnostics?.inputTrackFps,
      description:
        'The input track.getSettings().frameRate value. Longpipe uses this value when frame counters are unavailable; it is not an independent frame count.',
    },
    {
      label: 'Counted input FPS',
      value: fpsDiagnostics?.countedInputFps,
      description:
        'Frame rate calculated from the change in input track.stats.totalFrames between dashboard samples. A dash means the browser exposes no usable counter or the first sample is still pending.',
    },
    {
      label: 'Input FPS source',
      value: fpsDiagnostics?.inputFpsSource,
      description:
        'Identifies the input data available to Longpipe: track-settings is the fallback without a frame counter, track-counter uses track frame statistics, and video-frame-callback uses presented-frame counts. During counter warm-up Longpipe can still use track settings.',
    },
    {
      label: 'Model FPS',
      value: stats?.modelFps,
      description:
        'In this SDK version, this counts model timing samples in the last second. WebGPU samples every fifth model run, so this is not the actual inference rate.',
    },
    {
      label: 'Model time',
      value: stats?.modelMs,
      unit: ' ms',
      description: 'Median duration of sampled model runs. WebGPU timing samples include a GPU synchronization step.',
    },
    {
      label: 'Display time',
      value: stats?.displayMs,
      unit: ' ms',
      description:
        'Median time spent submitting rendering work. Asynchronous GPU execution may continue after this measurement.',
    },
    {
      label: 'Latency',
      value: stats?.latencyMs,
      unit: ' ms',
      description:
        'Internal frame-path latency reported by Longpipe. This is not end-to-end call latency and may not include all asynchronous GPU work.',
    },
    {
      label: 'Skipped',
      value: stats?.skipped,
      description:
        'Cumulative number of skipped full model runs in the current renderer. Intermediate video frames can still be processed; this is not a lost-video-frame counter.',
    },
    {
      label: 'Skip frames',
      value: stats?.skipFrames,
      description:
        'Configured number of frames between full model runs. A value of 1 skips one full model run between inferences; it does not necessarily halve output FPS.',
    },
    {
      label: 'Enabled',
      value: stats?.enabled,
      description: 'Whether effect processing is currently enabled.',
    },
    {
      label: 'Input path',
      value: stats?.inputPath,
      description:
        'How camera frames enter the pipeline. mstp means MediaStreamTrackProcessor; rvfc-postmessage uses video-frame callbacks and worker messages.',
    },
    {
      label: 'Output path',
      value: stats?.outputPath,
      description:
        'How processed frames become a video track. mstg means MediaStreamTrackGenerator; other paths use canvas capture.',
    },
    {
      label: 'Restarts',
      value: stats?.restarts,
      description:
        'Internal recovery restarts in the current Longpipe instance. Recreating the pipeline for a resolution change starts a new instance and resets this counter.',
    },
  ];

  return (
    <div css={metricsListStyles}>
      <div css={metricsRowStyles}>
        <strong>Longpipe · getStats()</strong>
      </div>
      {rows.map(row => {
        return (
          <div key={row.label} css={metricsRowStyles}>
            <details css={{flex: 1, minWidth: 0, maxWidth: '300px', marginRight: '12px'}}>
              <summary css={[metricsLabelStyles, {cursor: 'pointer'}]} aria-label={`About ${row.label}`}>
                {row.label}
              </summary>
              <p css={{margin: '6px 0 12px', lineHeight: 1.5}}>{row.description}</p>
            </details>
            <span css={metricsValueStyles}>{formatValue(row.value, row.unit)}</span>
          </div>
        );
      })}
    </div>
  );
};

export const VideoBackgroundPerformancePanel: FunctionComponent<PerformancePanelProps> = ({
  backgroundEffectsHandler,
}) => {
  const {translate} = useApplicationContext();
  const enabled = useBackgroundEffectsStore(state => {
    return state.isPerformancePanelEnabled;
  });
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [quality, setQuality] = useState<QualityMode>(backgroundEffectsHandler.getQuality());

  useEffect(() => {
    if (!enabled || !isPanelOpen) {
      return;
    }
    const interval = setInterval(() => {
      setQuality(backgroundEffectsHandler.getQuality());
    }, POLLING_INTERVAL_MS);
    return () => {
      clearInterval(interval);
    };
  }, [backgroundEffectsHandler, enabled, isPanelOpen]);

  useEffect(() => {
    if (!enabled) {
      setIsPanelOpen(false);
    }
  }, [enabled]);

  if (!enabled) {
    return null;
  }
  return (
    <div css={performancePanelContainerStyles}>
      <button
        type="button"
        onClick={() => {
          setIsPanelOpen(!isPanelOpen);
        }}
        css={[buttonBaseStyles, buttonNeutralStyles]}
        aria-expanded={isPanelOpen}
        aria-haspopup="dialog"
      >
        Performance
      </button>
      {isPanelOpen && (
        <div css={performancePanelStyles} role="dialog" aria-label={translate('videoCallBackgroundsPerformancePanel')}>
          <div css={performancePanelHeaderStyles}>
            <h3 css={performancePanelTitleStyles}>{translate('videoCallBackgroundsPerformancePanel')}</h3>
            <button
              type="button"
              className="icon-button"
              css={performancePanelCloseButtonStyles}
              onClick={() => {
                setIsPanelOpen(false);
              }}
              aria-label={translate('modalCloseButton')}
            >
              <CloseIcon width={12} height={12} />
            </button>
          </div>
          <label htmlFor="background-effects-quality">Output resolution (Auto adapts to FPS)</label>
          <Select
            id="background-effects-quality"
            inputId="background-effects-quality"
            dataUieName="background-effects-quality"
            aria-label="Background effects output resolution"
            value={
              qualityOptions.find(option => {
                return option.value === quality;
              }) ?? null
            }
            options={qualityOptions}
            isSearchable={false}
            menuPlacement="auto"
            onChange={option => {
              if (option !== null && option !== undefined) {
                const next = option.value as QualityMode;
                setQuality(next);
                backgroundEffectsHandler.applyQuality(next);
              }
            }}
          />
          <MetricsDisplay />
        </div>
      )}
    </div>
  );
};
