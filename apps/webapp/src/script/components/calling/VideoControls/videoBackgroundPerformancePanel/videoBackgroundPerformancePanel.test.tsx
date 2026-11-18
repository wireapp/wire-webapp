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

import {fireEvent, render, screen} from '@testing-library/react';
import type {PipelineStats} from 'longpipe';

import {VideoBackgroundPerformancePanel} from './videoBackgroundPerformancePanel';

import {BackgroundEffectsHandler} from '../../../../repositories/media/backgroundEffectsHandler';
import {backgroundEffectsStore} from '../../../../repositories/media/useBackgroundEffectsStore';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../page/testSupport/rootContextTestSupport';
import {translateForTest} from '../../../../util/test/translateForTest';
import {withTheme} from '../../../../auth/util/test/testUtil';

describe('VideoBackgroundPerformancePanel', () => {
  it('shows Longpipe statistics with expandable English descriptions and removes legacy metrics', () => {
    backgroundEffectsStore.setState(backgroundEffectsStore.getInitialState(), true);
    const handler = new BackgroundEffectsHandler();
    backgroundEffectsStore.getState().setIsPerformancePanelEnabled(true);
    const stats: PipelineStats = {
      fps: 27,
      modelFps: 15,
      modelMs: 12,
      displayMs: 2,
      skipped: 3,
      preset: 'small',
      skipFrames: 1,
      enabled: true,
      inputPath: 'mstp',
      outputPath: 'mstg',
      backend: 'webgpu',
      latencyMs: 17,
      status: 'running',
      inputFps: 30,
      restarts: 0,
    };
    backgroundEffectsStore.getState().setLongpipeStats(stats);
    backgroundEffectsStore.getState().setFpsDiagnostics({
      requestedInputFps: 15,
      inputTrackFps: 30,
      countedInputFps: null,
      inputFpsSource: 'track-settings',
    });
    backgroundEffectsStore.getState().setFrameSizes({
      input: {width: 1280, height: 720},
      output: {width: 640, height: 360},
      requestedOutput: {width: 640, height: 360},
    });
    const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));
    render(withTheme(<VideoBackgroundPerformancePanel backgroundEffectsHandler={handler} />), {wrapper});
    fireEvent.click(screen.getByRole('button', {name: 'Performance'}));
    expect(screen.getByText('webgpu')).toBeInTheDocument();
    expect(screen.getByText('27.0')).toBeInTheDocument();
    expect(screen.getByText('12.0 ms')).toBeInTheDocument();
    expect(screen.getByText('small')).toBeInTheDocument();
    expect(screen.getByText('track-settings')).toBeInTheDocument();
    expect(screen.getByLabelText('About Counted input FPS')).toBeInTheDocument();
    expect(screen.getByText('1280 × 720 px')).toBeInTheDocument();
    expect(screen.getAllByText('640 × 360 px')).toHaveLength(2);
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
    expect(screen.queryByText('Utilization')).not.toBeInTheDocument();
    expect(screen.queryByText('Previous engine · unavailable')).not.toBeInTheDocument();
    const help = screen.getByLabelText('About Model FPS');
    fireEvent.click(help);
    expect(help.parentElement).toHaveAttribute('open');
    expect(screen.getByText(/WebGPU samples every fifth model run/)).toBeVisible();
  });
});
