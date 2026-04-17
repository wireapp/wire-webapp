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

import {createDeterministicEventListenerService} from './deterministicEventListenerService';

describe('createDeterministicEventListenerService', () => {
  it('dispatches an event to a registered listener', () => {
    const service = createDeterministicEventListenerService();
    const listener = jest.fn();
    const event = new Event('click');

    service.addEventListener('click', listener);
    service.dispatch('click', event);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(event);
  });

  it('does not dispatch to listeners of a different event type', () => {
    const service = createDeterministicEventListenerService();
    const clickListener = jest.fn();
    const keydownListener = jest.fn();

    service.addEventListener('click', clickListener);
    service.addEventListener('keydown', keydownListener);
    service.dispatch('click', new Event('click'));

    expect(clickListener).toHaveBeenCalledTimes(1);
    expect(keydownListener).not.toHaveBeenCalled();
  });

  it('dispatches to all listeners registered for the same type in registration order', () => {
    const service = createDeterministicEventListenerService();
    const executionOrder: string[] = [];

    service.addEventListener('click', () => executionOrder.push('first'));
    service.addEventListener('click', () => executionOrder.push('second'));
    service.addEventListener('click', () => executionOrder.push('third'));
    service.dispatch('click', new Event('click'));

    expect(executionOrder).toEqual(['first', 'second', 'third']);
  });

  it('does not dispatch after removeEventListener', () => {
    const service = createDeterministicEventListenerService();
    const listener = jest.fn();

    service.addEventListener('click', listener);
    service.removeEventListener('click', listener);
    service.dispatch('click', new Event('click'));

    expect(listener).not.toHaveBeenCalled();
  });

  it('only removes the listener matching the provided capture flag', () => {
    const service = createDeterministicEventListenerService();
    const listener = jest.fn();

    service.addEventListener('click', listener, {capture: false});
    service.removeEventListener('click', listener, {capture: true});
    service.dispatch('click', new Event('click'));

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('removes only the first matching listener when duplicates are registered', () => {
    const service = createDeterministicEventListenerService();
    const listener = jest.fn();

    service.addEventListener('click', listener);
    service.addEventListener('click', listener);
    service.removeEventListener('click', listener);
    service.dispatch('click', new Event('click'));

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does nothing when dispatching a type with no registered listeners', () => {
    const service = createDeterministicEventListenerService();

    expect(() => service.dispatch('click', new Event('click'))).not.toThrow();
  });

  it('does nothing when removing a listener for a type that was never registered', () => {
    const service = createDeterministicEventListenerService();
    const listener = jest.fn();

    expect(() => service.removeEventListener('click', listener)).not.toThrow();
  });

  it('ignores null listeners in addEventListener', () => {
    const service = createDeterministicEventListenerService();

    expect(() => service.addEventListener('click', null)).not.toThrow();
    expect(() => service.dispatch('click', new Event('click'))).not.toThrow();
  });

  it('ignores null listeners in removeEventListener', () => {
    const service = createDeterministicEventListenerService();

    expect(() => service.removeEventListener('click', null)).not.toThrow();
  });

  it('calls handleEvent on an EventListenerObject', () => {
    const service = createDeterministicEventListenerService();
    const event = new Event('click');
    const listenerObject: EventListenerObject = {handleEvent: jest.fn()};

    service.addEventListener('click', listenerObject);
    service.dispatch('click', event);

    expect(listenerObject.handleEvent).toHaveBeenCalledTimes(1);
    expect(listenerObject.handleEvent).toHaveBeenCalledWith(event);
  });

  it('fires a once listener only once then auto-removes it', () => {
    const service = createDeterministicEventListenerService();
    const listener = jest.fn();

    service.addEventListener('click', listener, {once: true});
    service.dispatch('click', new Event('click'));
    service.dispatch('click', new Event('click'));

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps non-once listeners after dispatch when a once listener is also registered', () => {
    const service = createDeterministicEventListenerService();
    const onceListener = jest.fn();
    const persistentListener = jest.fn();

    service.addEventListener('click', onceListener, {once: true});
    service.addEventListener('click', persistentListener);
    service.dispatch('click', new Event('click'));
    service.dispatch('click', new Event('click'));

    expect(onceListener).toHaveBeenCalledTimes(1);
    expect(persistentListener).toHaveBeenCalledTimes(1);
  });

  it('treats boolean capture option as the capture flag', () => {
    const service = createDeterministicEventListenerService();
    const captureListener = jest.fn();
    const bubbleListener = jest.fn();

    service.addEventListener('click', captureListener, true);
    service.addEventListener('click', bubbleListener, false);

    service.removeEventListener('click', captureListener, true);
    service.dispatch('click', new Event('click'));

    expect(captureListener).not.toHaveBeenCalled();
    expect(bubbleListener).toHaveBeenCalledTimes(1);
  });
});
