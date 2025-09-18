/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {getConnectionQualityHander} from './';

describe('ConnectionQualityListener', () => {
  let originalNavigator: any;
  let mockConnection: any;

  beforeEach(() => {
    originalNavigator = {...navigator};
    mockConnection = {
      effectiveType: '4g',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    (navigator as any).connection = mockConnection;
  });

  afterEach(() => {
    (navigator as any).connection = originalNavigator.connection;
  });

  it('should return null if navigator.connection is not supported', () => {
    (navigator as any).connection = undefined;
    const handler = getConnectionQualityHander();
    expect(handler).toBeNull();
  });

  it('should initialize the handler if navigator.connection is supported', () => {
    const handler = getConnectionQualityHander();
    expect(handler).not.toBeNull();
    expect(typeof handler!.refresh).toBe('function');
    expect(typeof handler!.subscribe).toBe('function');
  });

  it.each(['slow-2g', '2g', '3g'])('should detect slow connections correctly', (quality: string) => {
    mockConnection.effectiveType = quality;
    const handler = getConnectionQualityHander();
    const callback = jest.fn();
    handler!.refresh(callback);
    expect(callback).toHaveBeenCalledWith(true);
  });

  it('should detect stable correctly', () => {
    mockConnection.effectiveType = '4g';
    const handler = getConnectionQualityHander();
    const callback = jest.fn();
    handler!.refresh(callback);
    expect(callback).toHaveBeenCalledWith(false);
  });

  it('should call the callback on connection change', () => {
    const handler = getConnectionQualityHander();
    const callback = jest.fn();

    handler!.subscribe(callback);
    expect(callback).toHaveBeenCalled();

    const changeEvent = new Event('change');
    mockConnection.effectiveType = '2g';
    mockConnection.addEventListener.mock.calls[0][1](changeEvent);
    expect(callback).toHaveBeenCalledWith(true);

    mockConnection.effectiveType = '4g';
    mockConnection.addEventListener.mock.calls[0][1](changeEvent);
    expect(callback).toHaveBeenCalledWith(false);
  });

  it('should unsubscribe properly', () => {
    const handler = getConnectionQualityHander();
    const callback = jest.fn();
    const unsubscribe = handler!.subscribe(callback);

    unsubscribe();

    expect(mockConnection.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should refresh the connection quality periodically', () => {
    jest.useFakeTimers();
    const handler = getConnectionQualityHander();
    const callback = jest.fn();

    handler!.subscribe(callback);

    jest.advanceTimersByTime(60000);
    expect(callback).toHaveBeenCalledTimes(2); // Initial call + 1 refresh

    jest.advanceTimersByTime(60000);
    expect(callback).toHaveBeenCalledTimes(3); // 2nd refresh

    jest.useRealTimers();
  });
});
