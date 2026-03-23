import {useEffect, useState} from 'react';

import type {BackgroundEffectsHandler, RenderMetrics} from 'Repositories/media/BackgroundEffectsHandler';
import {QualityMode} from 'Repositories/media/BackgroundEffects';
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
} from 'Components/calling/PerformancePanel/PerformancePannel.styles';
import {CapabilityInfo} from 'Repositories/media/BackgroundEffects/types';

type Props = {
  backgroundEffectsHandler: BackgroundEffectsHandler;
};

const QUALITY_OPTIONS: QualityMode[] = [
  'auto',
  'superhigh',
  'high',
  'medium',
  'low',
  'bypass',
];

export const PerformancePanel = ({backgroundEffectsHandler}: Props) => {
  const [enabled, setEnabled] = useState(
    backgroundEffectsHandler.isVideoBackgroundEffectsFeatureEnabled()
  );

  const [quality, setQuality] = useState<QualityMode>(
    backgroundEffectsHandler.getQuality()
  );

  const [isOpen, setIsOpen] = useState(false);

  const [metrics, setMetrics] = useState<RenderMetrics | null>(null);
  const [capabilities, setCapabilities] = useState<CapabilityInfo | null>(null);
  const [model, setModel] = useState<string>('');

  // -------------------------
  // Feature enabled subscribe
  // -------------------------
  useEffect(() => {
    const sub =
      backgroundEffectsHandler.isVideoBackgroundEffectsFeatureEnabled.subscribe(
        value => setEnabled(value)
      );

    return () => sub.dispose();
  }, [backgroundEffectsHandler]);

  // -------------------------
  // Quality polling (fallback)
  // -------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      const current = backgroundEffectsHandler.getQuality();
      setQuality(prev => (prev !== current ? current : prev));
    }, 500);

    return () => clearInterval(interval);
  }, [backgroundEffectsHandler]);

  // -------------------------
  // Metrics subscription (FIXED)
  // -------------------------
  useEffect(() => {
    setModel(backgroundEffectsHandler.getModel());
    setCapabilities(backgroundEffectsHandler.getCapabilityInfo());

    // initial value (wichtig!)
    const initial = backgroundEffectsHandler.metrics();
    if (initial) {
      setMetrics({...initial});
    }

    const sub = backgroundEffectsHandler.metrics.subscribe((m) => {
      if (!m) return;

      // neue Referenz → React render
      setMetrics({...m});
    });

    return () => sub.dispose();
  }, [backgroundEffectsHandler]);

  // -------------------------
  // Optional fallback polling (DEBUG ONLY)
  // -------------------------
  /*
  useEffect(() => {
    const interval = setInterval(() => {
      const m = backgroundEffectsHandler.getMetrics?.();
      if (m) {
        setMetrics({...m});
      }
    }, 500);

    return () => clearInterval(interval);
  }, [backgroundEffectsHandler]);
  */

  // -------------------------
  // Auto close if disabled
  // -------------------------
  useEffect(() => {
    if (!enabled) {
      setIsOpen(false);
    }
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <div css={performancePanelContainerStyles}>
      <button onClick={() => setIsOpen(true)} css={[buttonBaseStyles, buttonNeutralStyles]}>
        Performance
      </button>

      {isOpen && (
        <div css={performancePanelStyles}>
          <h3>Performance Panel</h3>

          {/* -------------------------
              Quality Select
          ------------------------- */}
          <select
            css={performancePanelSelectStyles}
            value={quality}
            onChange={event => {
              const newQuality = event.target.value as QualityMode;
              setQuality(newQuality);
              backgroundEffectsHandler.applyQuality(newQuality);
            }}
          >
            {QUALITY_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          {/* -------------------------
              Buttons
          ------------------------- */}
          <div css={buttonRowStyles}>
            <button
              onClick={() => backgroundEffectsHandler.applyQuality(quality)}
              css={buttonBaseStyles}
            >
              Apply
            </button>

            <button
              css={buttonBaseStyles}
              onClick={() => {
                setQuality('auto');
                backgroundEffectsHandler.applyQuality('auto');
              }}
            >
              Reset (Auto)
            </button>

            <button onClick={() => setIsOpen(false)} css={buttonBaseStyles}>
              Close
            </button>
          </div>

          {/* -------------------------
              Metrics
          ------------------------- */}
          <div css={metricsListStyles}>
            <div css={metricsRowStyles}>
              <span css={metricsLabelStyles}>Model</span>
              <span css={metricsValueStyles}>{model}</span>
            </div>

            {metrics && (
              <>
                <div css={metricsRowStyles}>
                  <span css={metricsLabelStyles}>Quality</span>
                  <span css={metricsValueStyles}>{metrics.tier}</span>
                </div>

                <div css={metricsRowStyles}>
                  <span css={metricsLabelStyles}>Total</span>
                  <span css={metricsValueStyles}>{metrics.avgTotalMs.toFixed(1)} ms</span>
                </div>

                <div css={metricsRowStyles}>
                  <span css={metricsLabelStyles}>Segmentation</span>
                  <span css={metricsValueStyles}>
                    {metrics.avgSegmentationMs.toFixed(1)} ms
                  </span>
                </div>

                <div css={metricsRowStyles}>
                  <span css={metricsLabelStyles}>GPU</span>
                  <span css={metricsValueStyles}>{metrics.avgGpuMs.toFixed(1)} ms</span>
                </div>

                <div css={metricsRowStyles}>
                  <span css={metricsLabelStyles}>Budget</span>
                  <span css={metricsValueStyles}>{metrics.budget.toFixed(1)} ms</span>
                </div>

                <div css={metricsRowStyles}>
                  <span css={metricsLabelStyles}>ML delegate type</span>
                  <span css={metricsValueStyles}>{metrics.ml}</span>
                </div>

                <div css={metricsRowStyles}>
                  <span css={metricsLabelStyles}>Utilization</span>
                  <span css={metricsValueStyles}>{metrics.utilShare.toFixed(1)} %s</span>
                </div>

                <div css={metricsRowStyles}>
                  <span css={metricsLabelStyles}>ML</span>
                  <span css={metricsValueStyles}>{metrics.mlShare.toFixed(1)} %s</span>
                </div>

                <div css={metricsRowStyles}>
                  <span css={metricsLabelStyles}>WebGL</span>
                  <span css={metricsValueStyles}>{metrics.webglShare.toFixed(1)} %s</span>
                </div>

                <div css={metricsRowStyles}>
                  <span css={metricsLabelStyles}>Delegate</span>
                  <span css={metricsValueStyles}>
                    {metrics.segmentationDelegate ?? '-'}
                  </span>
                </div>

                <div css={metricsRowStyles}>
                  <span css={metricsLabelStyles}>Dropped</span>
                  <span css={metricsValueStyles}>{metrics.droppedFrames}</span>
                </div>
              </>
            )}

            {/* -------------------------
                Capabilities
            ------------------------- */}
            {capabilities && (
              <>
                <div css={metricsRowStyles}>
                  <span css={metricsLabelStyles}>WebGL2</span>
                  <span css={metricsValueStyles}>
                    {capabilities.webgl2 ? '✔' : '✖'}
                  </span>
                </div>

                <div css={metricsRowStyles}>
                  <span css={metricsLabelStyles}>Worker</span>
                  <span css={metricsValueStyles}>
                    {capabilities.worker ? '✔' : '✖'}
                  </span>
                </div>

                <div css={metricsRowStyles}>
                  <span css={metricsLabelStyles}>OffscreenCanvas</span>
                  <span css={metricsValueStyles}>
                    {capabilities.offscreenCanvas ? '✔' : '✖'}
                  </span>
                </div>

                <div css={metricsRowStyles}>
                  <span css={metricsLabelStyles}>VideoFrameCallback</span>
                  <span css={metricsValueStyles}>
                    {capabilities.requestVideoFrameCallback ? '✔' : '✖'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
