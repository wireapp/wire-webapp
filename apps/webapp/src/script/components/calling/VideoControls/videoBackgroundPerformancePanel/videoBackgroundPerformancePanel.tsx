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

import {ReactNode, useCallback, useEffect, useMemo, useState} from 'react';

import {Maybe} from 'true-myth';

import {Button, ButtonVariant, CloseIcon, Option, Select} from '@wireapp/react-ui-kit';

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
  performancePanelResetButtonContainerStyles,
  performancePanelResetButtonStyles,
  performancePanelStyles,
  performancePanelTitleStyles,
} from 'Components/calling/VideoControls/videoBackgroundPerformancePanel/videoBackgroundPerformancePanel.styles';
import {QualityMode} from 'Repositories/media/backgroundEffects';
import {CapabilityInfo} from 'Repositories/media/backgroundEffects/backgroundEffectsWorkerTypes';
import type {BackgroundEffectsHandler} from 'Repositories/media/backgroundEffectsHandler';
import {RenderMetrics, useBackgroundEffectsStore} from 'Repositories/media/useBackgroundEffectsStore';
import {t} from 'Util/localizerUtil';

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

const getMetricRows = (renderMetrics: RenderMetrics) => {
  return Maybe.of(renderMetrics)
    .map(metrics => [
      {label: 'Quality', value: formatValue(metrics.tier)},
      {label: 'Total', value: formatMs(metrics.avgTotalMs)},
      {label: 'Segmentation', value: formatMs(metrics.avgSegmentationMs)},
      {label: 'GPU', value: formatMs(metrics.avgGpuMs)},
      {label: 'Budget', value: formatMs(metrics.budget)},
      {label: 'ML delegate type', value: formatValue(metrics.ml)},
      {label: 'Utilization', value: formatPercent(metrics.utilShare)},
      {label: 'ML', value: formatPercent(metrics.mlShare)},
      {label: 'WebGL', value: formatPercent(metrics.webglShare)},
      {
        label: 'Delegate',
        value: formatValue(metrics.segmentationDelegate),
      },
      {label: 'Dropped', value: formatValue(metrics.droppedFrames)},
    ])
    .unwrapOr([]);
};

const getCapabilityRows = (capabilityInfo: CapabilityInfo | null | undefined) => {
  return Maybe.of(capabilityInfo)
    .map(info => [
      {label: 'WebGL2', value: info.webgl2 ? '✔' : '✖'},
      {label: 'Worker', value: info.worker ? '✔' : '✖'},
      {label: 'OffscreenCanvas', value: info.offscreenCanvas ? '✔' : '✖'},
      {label: 'VideoFrameCallback', value: info.requestVideoFrameCallback ? '✔' : '✖'},
    ])
    .unwrapOr([]);
};

const areCapabilityInfosEqual = (
  prev: CapabilityInfo | null | undefined,
  current: CapabilityInfo | null | undefined,
): boolean => {
  if (prev === current) {
    return true;
  }

  return Maybe.of(prev)
    .andThen(prevValue =>
      Maybe.of(current).map(
        currentValue =>
          prevValue.webgl2 === currentValue.webgl2 &&
          prevValue.worker === currentValue.worker &&
          prevValue.offscreenCanvas === currentValue.offscreenCanvas &&
          prevValue.requestVideoFrameCallback === currentValue.requestVideoFrameCallback,
      ),
    )
    .unwrapOr(false);
};

type MetricRowProps = {
  label: string;
  value: ReactNode;
};

type MetricsDisplayProps = {
  readonly capabilityInfo: CapabilityInfo;
};

const MetricRow = ({label, value}: MetricRowProps) => (
  <div css={metricsRowStyles}>
    <span css={metricsLabelStyles}>{label}</span>
    <span css={metricsValueStyles}>{value}</span>
  </div>
);

const POLLING_INTERVAL = 500;

const MetricsDisplay = ({capabilityInfo}: MetricsDisplayProps) => {
  const renderMetrics = useBackgroundEffectsStore(state => state.metrics);
  const model = useBackgroundEffectsStore(state => state.model);

  const metricRows = getMetricRows(renderMetrics);

  const capabilityRows = getCapabilityRows(capabilityInfo);

  return (
    <div css={metricsListStyles}>
      <MetricRow label="Model" value={formatValue(model)} />
      {metricRows.map(row => (
        <MetricRow key={row.label} label={row.label} value={row.value} />
      ))}
      {capabilityRows.map(row => (
        <MetricRow key={row.label} label={row.label} value={row.value} />
      ))}
    </div>
  );
};

const qualitySelectOptions = QUALITY_OPTIONS.map(option => ({
  label: option,
  value: option,
}));

export const VideoBackgroundPerformancePanel = ({backgroundEffectsHandler}: PerformancePanelProps) => {
  const isFeatureEnabled = useBackgroundEffectsStore(state => state.isFeatureEnabled);

  const [selectedQuality, setSelectedQuality] = useState<QualityMode>(() => backgroundEffectsHandler.getQuality());
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [capabilityInfo, setCapabilityInfo] = useState<CapabilityInfo | null>(null);

  const selectedOption = useMemo(
    () => qualitySelectOptions.find(option => option.value === selectedQuality) ?? null,
    [selectedQuality],
  );

  useEffect(() => {
    if (!isFeatureEnabled) {
      setCapabilityInfo(null);
      return undefined;
    }

    setCapabilityInfo(backgroundEffectsHandler.getCapabilityInfo());
  }, [backgroundEffectsHandler, isFeatureEnabled]);

  // Quality polling (fallback for non-reactive quality)
  useEffect(() => {
    if (!isFeatureEnabled) {
      return undefined;
    }

    const interval = setInterval(() => {
      const current = backgroundEffectsHandler.getQuality();

      setSelectedQuality(prev => (prev !== current ? current : prev));
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [backgroundEffectsHandler, isFeatureEnabled]);

  // Capability polling (controller updates these after pipeline start)
  useEffect(() => {
    if (!isFeatureEnabled) {
      setCapabilityInfo(null);
      return undefined;
    }

    const syncCapabilities = () => {
      const current = backgroundEffectsHandler.getCapabilityInfo();
      setCapabilityInfo(prev => (areCapabilityInfosEqual(prev, current) ? prev : current));
    };

    syncCapabilities();

    const interval = setInterval(syncCapabilities, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [backgroundEffectsHandler, isFeatureEnabled]);

  // Auto close if disabled
  useEffect(() => {
    if (!isFeatureEnabled && isPanelOpen) {
      setIsPanelOpen(false);
    }
  }, [isFeatureEnabled, isPanelOpen]);

  const togglePerformancePanel = () => {
    setIsPanelOpen(prev => !prev);
  };

  const handleQualityChange = useCallback(
    (quality: Option) => {
      if (quality === undefined || quality === null) {
        return;
      }

      const nextQuality = quality.value as QualityMode;
      setSelectedQuality(nextQuality);
      backgroundEffectsHandler.applyQuality(nextQuality);
    },
    [backgroundEffectsHandler],
  );

  const handleResetQuality = useCallback(() => {
    const defaultQuality: QualityMode = 'auto';
    setSelectedQuality(defaultQuality);
    backgroundEffectsHandler.applyQuality(defaultQuality);
  }, [backgroundEffectsHandler]);

  if (!isFeatureEnabled) {
    return null;
  }

  return (
    <div css={performancePanelContainerStyles}>
      <button
        type="button"
        onClick={togglePerformancePanel}
        css={[buttonBaseStyles, buttonNeutralStyles]}
        aria-expanded={isPanelOpen}
        aria-haspopup="dialog"
      >
        Performance
      </button>

      {isPanelOpen && (
        <div css={performancePanelStyles} role="dialog" aria-label={t('videoCallBackgroundsPerformancePanel')}>
          <div css={performancePanelHeaderStyles}>
            <h3 css={performancePanelTitleStyles}>{t('videoCallBackgroundsPerformancePanel')}</h3>
            <button
              type="button"
              className="icon-button"
              css={performancePanelCloseButtonStyles}
              onClick={togglePerformancePanel}
              aria-label={t('modalCloseButton')}
            >
              <CloseIcon width={12} height={12} />
            </button>
          </div>

          <Select
            id="background-effects-quality"
            inputId="background-effects-quality"
            dataUieName="background-effects-quality"
            aria-label="Background effects quality"
            value={selectedOption}
            options={qualitySelectOptions}
            isSearchable={true}
            menuPlacement="auto"
            onChange={handleQualityChange}
          />

          <div css={performancePanelResetButtonContainerStyles}>
            <Button
              css={performancePanelResetButtonStyles}
              variant={ButtonVariant.TERTIARY}
              onClick={handleResetQuality}
            >
              Reset (Auto)
            </Button>
          </div>

          <MetricsDisplay capabilityInfo={capabilityInfo} />
        </div>
      )}
    </div>
  );
};
