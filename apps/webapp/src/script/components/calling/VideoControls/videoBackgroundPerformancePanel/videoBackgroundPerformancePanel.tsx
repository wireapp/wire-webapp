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

import {ChangeEvent, ReactNode, useCallback, useEffect, useMemo, useState} from 'react';

import {
  buttonBaseStyles,
  buttonNeutralStyles,
  buttonRowStyles,
  metricsLabelStyles,
  metricsListStyles,
  metricsRowStyles,
  metricsValueStyles,
  performancePanelContainerStyles,
  performancePanelSelectStyles,
  performancePanelStyles,
} from 'Components/calling/VideoControls/videoBackgroundPerformancePanel/videoBackgroundPerformancePanel.styles';
import {QualityMode} from 'Repositories/media/backgroundEffects';
import {CapabilityInfo} from 'Repositories/media/backgroundEffects/backgroundEffectsWorkerTypes';
import type {BackgroundEffectsHandler} from 'Repositories/media/backgroundEffectsHandler';
import {useBackgroundEffectsStore} from 'Repositories/media/useBackgroundEffectsStore';

type PerformancePanelProps = {
  backgroundEffectsHandler: BackgroundEffectsHandler;
};

const QUALITY_OPTIONS: readonly QualityMode[] = ['auto', 'superhigh', 'high', 'medium', 'low', 'bypass'];

const formatMs = (value?: number | null): string => {
  return typeof value === 'number' ? `${value.toFixed(1)} ms` : '-';
};

const formatPercent = (value?: number | null): string => {
  return typeof value === 'number' ? `${value.toFixed(1)} %` : '-';
};

const formatValue = (value?: string | number | null): string => {
  return value === null || value === undefined || value === '' ? '-' : String(value);
};

type MetricRowProps = {
  label: string;
  value: ReactNode;
};

const MetricRow = ({label, value}: MetricRowProps) => (
  <div css={metricsRowStyles}>
    <span css={metricsLabelStyles}>{label}</span>
    <span css={metricsValueStyles}>{value}</span>
  </div>
);

const POLLING_INTERVAL = 500;

export const VideoBackgroundPerformancePanel = ({backgroundEffectsHandler}: PerformancePanelProps) => {
  const isFeatureEnabled = useBackgroundEffectsStore(state => state.isFeatureEnabled);
  const renderMetrics = useBackgroundEffectsStore(state => state.metrics);
  const model = useBackgroundEffectsStore(state => state.model);

  const [selectedQuality, setSelectedQuality] = useState<QualityMode>(() => backgroundEffectsHandler.getQuality());
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [capabilityInfo, setCapabilityInfo] = useState<CapabilityInfo | null>(null);

  useEffect(() => {
    setCapabilityInfo(backgroundEffectsHandler.getCapabilityInfo());
  }, [backgroundEffectsHandler]);

  // Quality polling (fallback for non-reactive quality)
  useEffect(() => {
    const interval = setInterval(() => {
      const current = backgroundEffectsHandler.getQuality();
      setSelectedQuality(prev => (prev !== current ? current : prev));
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [backgroundEffectsHandler]);

  // Auto close if disabled
  useEffect(() => {
    if (!isFeatureEnabled && isPanelOpen) {
      setIsPanelOpen(false);
    }
  }, [isFeatureEnabled, isPanelOpen]);

  const handleOpenPanel = useCallback(() => {
    setIsPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const handleQualityChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextQuality = event.target.value as QualityMode;
      setSelectedQuality(nextQuality);
      backgroundEffectsHandler.applyQuality(nextQuality);
    },
    [backgroundEffectsHandler],
  );

  const handleApplyQuality = useCallback(() => {
    backgroundEffectsHandler.applyQuality(selectedQuality);
  }, [backgroundEffectsHandler, selectedQuality]);

  const handleResetQuality = useCallback(() => {
    const defaultQuality: QualityMode = 'auto';
    setSelectedQuality(defaultQuality);
    backgroundEffectsHandler.applyQuality(defaultQuality);
  }, [backgroundEffectsHandler]);

  const metricRows = useMemo(() => {
    if (!renderMetrics) {
      return [];
    }

    return [
      {label: 'Quality', value: formatValue(renderMetrics.tier)},
      {label: 'Total', value: formatMs(renderMetrics.avgTotalMs)},
      {label: 'Segmentation', value: formatMs(renderMetrics.avgSegmentationMs)},
      {label: 'GPU', value: formatMs(renderMetrics.avgGpuMs)},
      {label: 'Budget', value: formatMs(renderMetrics.budget)},
      {label: 'ML delegate type', value: formatValue(renderMetrics.ml)},
      {label: 'Utilization', value: formatPercent(renderMetrics.utilShare)},
      {label: 'ML', value: formatPercent(renderMetrics.mlShare)},
      {label: 'WebGL', value: formatPercent(renderMetrics.webglShare)},
      {
        label: 'Delegate',
        value: formatValue(renderMetrics.segmentationDelegate),
      },
      {label: 'Dropped', value: formatValue(renderMetrics.droppedFrames)},
    ];
  }, [renderMetrics]);

  const capabilityRows = useMemo(() => {
    if (!capabilityInfo) {
      return [];
    }

    return [
      {label: 'WebGL2', value: capabilityInfo.webgl2 ? '✔' : '✖'},
      {label: 'Worker', value: capabilityInfo.worker ? '✔' : '✖'},
      {
        label: 'OffscreenCanvas',
        value: capabilityInfo.offscreenCanvas ? '✔' : '✖',
      },
      {
        label: 'VideoFrameCallback',
        value: capabilityInfo.requestVideoFrameCallback ? '✔' : '✖',
      },
    ];
  }, [capabilityInfo]);

  if (!isFeatureEnabled) {
    return null;
  }

  return (
    <div css={performancePanelContainerStyles}>
      <button
        type="button"
        onClick={handleOpenPanel}
        css={[buttonBaseStyles, buttonNeutralStyles]}
        aria-expanded={isPanelOpen}
        aria-haspopup="dialog"
      >
        Performance
      </button>

      {isPanelOpen && (
        <div css={performancePanelStyles} role="dialog" aria-label="Performance Panel">
          <h3>Performance Panel</h3>

          <select
            css={performancePanelSelectStyles}
            value={selectedQuality}
            onChange={handleQualityChange}
            aria-label="Background effects quality"
          >
            {QUALITY_OPTIONS.map(qualityOption => (
              <option key={qualityOption} value={qualityOption}>
                {qualityOption}
              </option>
            ))}
          </select>

          <div css={buttonRowStyles}>
            <button type="button" onClick={handleApplyQuality} css={buttonBaseStyles}>
              Apply
            </button>

            <button type="button" onClick={handleResetQuality} css={buttonBaseStyles}>
              Reset (Auto)
            </button>

            <button type="button" onClick={handleClosePanel} css={buttonBaseStyles}>
              Close
            </button>
          </div>

          <div css={metricsListStyles}>
            <MetricRow label="Model" value={formatValue(model)} />

            {metricRows.map(row => (
              <MetricRow key={row.label} label={row.label} value={row.value} />
            ))}

            {capabilityRows.map(row => (
              <MetricRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
