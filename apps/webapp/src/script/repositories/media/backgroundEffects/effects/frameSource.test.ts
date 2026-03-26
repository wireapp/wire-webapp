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

import {FrameSource} from './frameSource';

// Logger mock
jest.mock('Util/logger', () => ({
  getLogger: () => ({
    warn: jest.fn(),
    info: jest.fn(),
  }),
}));

// VideoSource mock
jest.mock('./videoSource', () => ({
  VideoSource: jest.fn().mockImplementation(() => ({
    element: {},
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
  })),
}));

describe('FrameSource', () => {
  let mockTrack: any;

  beforeEach(() => {
    mockTrack = {};
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete (window as any).MediaStreamTrackProcessor;
  });

  const createMockBitmap = () => ({
    width: 640,
    height: 480,
    close: jest.fn(),
  });

  // Mock createImageBitmap
  beforeAll(() => {
    global.createImageBitmap = jest.fn(() => Promise.resolve(createMockBitmap())) as any;
  });

  it('should use MediaStreamTrackProcessor if available', async () => {
    const readMock = jest
      .fn()
      .mockResolvedValueOnce({
        done: false,
        value: {
          timestamp: 1_000_000,
          close: jest.fn(),
        },
      })
      .mockResolvedValueOnce({done: true});

    const reader = {
      read: readMock,
      releaseLock: jest.fn(),
    };

    const processorMock = jest.fn().mockImplementation(() => ({
      readable: {
        getReader: () => reader,
      },
    }));

    (window as any).MediaStreamTrackProcessor = processorMock;

    const fs = new FrameSource(mockTrack);

    const onFrame = jest.fn();

    await fs.start(onFrame);

    // Wait for async loop
    await new Promise(r => setTimeout(r, 0));

    expect(processorMock).toHaveBeenCalled();
    expect(onFrame).toHaveBeenCalled();
  });

  it('should fallback to video element if processor not available', async () => {
    const fs = new FrameSource(mockTrack);
    const onFrame = jest.fn();

    await fs.start(onFrame);

    const {VideoSource} = require('./videoSource');

    expect(VideoSource).toHaveBeenCalled();
  });

  it('should call onFrame with correct params (video fallback)', async () => {
    const {VideoSource} = require('./videoSource');

    let callback: any;

    VideoSource.mockImplementation(() => ({
      element: {},
      start: jest.fn(cb => {
        callback = cb;
        return Promise.resolve();
      }),
      stop: jest.fn(),
    }));

    const fs = new FrameSource(mockTrack);

    const onFrame = jest.fn();

    await fs.start(onFrame);

    // simulate frame
    await callback(1, 640, 480);

    expect(onFrame).toHaveBeenCalled();
    const args = onFrame.mock.calls[0];

    expect(args[1]).toBe(1); // timestamp
    expect(args[2]).toBe(640);
    expect(args[3]).toBe(480);
  });

  it('should call onDrop when processing is busy', async () => {
    const {VideoSource} = require('./videoSource');

    let callback: any;

    VideoSource.mockImplementation(() => ({
      element: {},
      start: jest.fn(cb => {
        callback = cb;
        return Promise.resolve();
      }),
      stop: jest.fn(),
    }));

    const fs = new FrameSource(mockTrack);

    const onFrame = jest.fn(async () => {
      // simulate long processing
      await new Promise(r => setTimeout(r, 10));
    });

    const onDrop = jest.fn();

    await fs.start(onFrame, onDrop);

    // first frame (starts processing)
    callback(1, 640, 480);

    // second frame arrives while busy
    callback(2, 640, 480);

    expect(onDrop).toHaveBeenCalled();
  });

  it('should stop and clean up resources', async () => {
    const {VideoSource} = require('./videoSource');

    const stopMock = jest.fn();

    VideoSource.mockImplementation(() => ({
      element: {},
      start: jest.fn().mockResolvedValue(undefined),
      stop: stopMock,
    }));

    const fs = new FrameSource(mockTrack);

    await fs.start(jest.fn());

    await fs.stop();

    expect(stopMock).toHaveBeenCalled();
  });

  it('should not start twice', async () => {
    const fs = new FrameSource(mockTrack);
    const onFrame = jest.fn();

    await fs.start(onFrame);
    await fs.start(onFrame);

    // no crash / doppelte init
    expect(true).toBe(true);
  });
});
