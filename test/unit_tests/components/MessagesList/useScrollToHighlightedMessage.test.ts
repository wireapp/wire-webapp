/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useEffect} from 'react';

import {renderHook} from '@testing-library/react';

import {isMarker} from 'Components/MessagesList/utils/virtualizedMessagesGroup';

// Mock the isMarker function
jest.mock('Components/MessagesList/utils/virtualizedMessagesGroup', () => ({
  isMarker: jest.fn(),
}));

describe('useScrollToHighlightedMessage', () => {
  // Mock virtualizer
  const mockScrollToIndex = jest.fn();
  const mockVirtualizer = {
    scrollToIndex: mockScrollToIndex,
  };

  // Mock messages
  const mockMessage1 = {message: {id: 'msg-1'}};
  const mockMessage2 = {message: {id: 'msg-2'}};
  const mockMessage3 = {message: {id: 'msg-3'}};
  const mockMarker = {type: 'timestamp'};

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isMarker).mockImplementation((item: any) => item.type === 'timestamp');
  });

  // Helper to simulate the useEffect hook
  const useScrollToHighlightedMessage = (
    groupedMessages: any[],
    highlightedMessage: string | undefined,
    setHighlightedMessage: (value: string | undefined) => void,
  ) => {
    useEffect(() => {
      // setTimeout is a workaround for smoother scrolling in virtualizer
      // also without, creates race condition with scrolledToHighlightedMessage
      // https://github.com/TanStack/virtual/issues/216
      const setScrolledToHighlightedMessageTimeout = setTimeout(() => {
        // When we have a highlighted message, that is not visible yet, find the index
        if (highlightedMessage) {
          const highlightedMessageIndex = groupedMessages.findIndex(
            msg => !isMarker(msg) && msg.message.id === highlightedMessage,
          );

          // scroll the index if the message is there and not a timestamp
          if (highlightedMessageIndex !== -1) {
            mockVirtualizer.scrollToIndex(highlightedMessageIndex, {align: 'start'});
          }
          clearTimeout(setScrolledToHighlightedMessageTimeout);
          setTimeout(() => {
            setHighlightedMessage(undefined);
          }, 1000); // set to time of animation of highlightedMessage - @todo create const for animation time
        }
      }, 100);
    }, [groupedMessages, highlightedMessage]);
  };

  it('should not scroll when highlightedMessage is undefined', () => {
    const setHighlightedMessage = jest.fn();
    const groupedMessages = [mockMessage1, mockMessage2, mockMessage3];

    renderHook(() => useScrollToHighlightedMessage(groupedMessages, undefined, setHighlightedMessage));

    jest.advanceTimersByTime(100);

    expect(mockScrollToIndex).not.toHaveBeenCalled();
    expect(setHighlightedMessage).not.toHaveBeenCalled();
  });

  it('should scroll to the highlighted message index when found', () => {
    const setHighlightedMessage = jest.fn();
    const groupedMessages = [mockMessage1, mockMessage2, mockMessage3];

    renderHook(() => useScrollToHighlightedMessage(groupedMessages, 'msg-2', setHighlightedMessage));

    jest.advanceTimersByTime(100);

    expect(mockScrollToIndex).toHaveBeenCalledWith(1, {align: 'start'});
  });

  it('should clear highlighted message after 1000ms', () => {
    const setHighlightedMessage = jest.fn();
    const groupedMessages = [mockMessage1, mockMessage2, mockMessage3];

    renderHook(() => useScrollToHighlightedMessage(groupedMessages, 'msg-2', setHighlightedMessage));

    // Advance past the initial scroll timeout
    jest.advanceTimersByTime(100);

    expect(setHighlightedMessage).not.toHaveBeenCalled();

    // Advance to clear highlighted message
    jest.advanceTimersByTime(1000);

    expect(setHighlightedMessage).toHaveBeenCalledWith(undefined);
  });

  it('should not scroll when highlighted message is not found in groupedMessages', () => {
    const setHighlightedMessage = jest.fn();
    const groupedMessages = [mockMessage1, mockMessage2, mockMessage3];

    renderHook(() => useScrollToHighlightedMessage(groupedMessages, 'msg-nonexistent', setHighlightedMessage));

    jest.advanceTimersByTime(100);

    expect(mockScrollToIndex).not.toHaveBeenCalled();
    // Should still clear the highlighted message
    jest.advanceTimersByTime(1000);
    expect(setHighlightedMessage).toHaveBeenCalledWith(undefined);
  });

  it('should skip marker items when finding the message index', () => {
    const setHighlightedMessage = jest.fn();
    const groupedMessages = [mockMarker, mockMessage1, mockMessage2, mockMessage3];

    renderHook(() => useScrollToHighlightedMessage(groupedMessages, 'msg-2', setHighlightedMessage));

    jest.advanceTimersByTime(100);

    // Should find message at index 2 (skipping marker at index 0)
    expect(mockScrollToIndex).toHaveBeenCalledWith(2, {align: 'start'});
  });

  it('should re-execute when highlightedMessage changes', () => {
    const setHighlightedMessage = jest.fn();
    const groupedMessages = [mockMessage1, mockMessage2, mockMessage3];

    const {rerender} = renderHook(
      ({highlightedMsg}) => useScrollToHighlightedMessage(groupedMessages, highlightedMsg, setHighlightedMessage),
      {initialProps: {highlightedMsg: 'msg-1'}},
    );

    jest.advanceTimersByTime(100);
    expect(mockScrollToIndex).toHaveBeenCalledWith(0, {align: 'start'});

    // Change highlighted message
    rerender({highlightedMsg: 'msg-3'});
    jest.advanceTimersByTime(100);

    expect(mockScrollToIndex).toHaveBeenCalledWith(2, {align: 'start'});
    expect(mockScrollToIndex).toHaveBeenCalledTimes(2);
  });

  it('should re-execute when groupedMessages changes', () => {
    const setHighlightedMessage = jest.fn();
    const initialMessages = [mockMessage1, mockMessage2];

    const {rerender} = renderHook(
      ({messages}) => useScrollToHighlightedMessage(messages, 'msg-3', setHighlightedMessage),
      {initialProps: {messages: initialMessages}},
    );

    jest.advanceTimersByTime(100);
    // Message not found initially
    expect(mockScrollToIndex).not.toHaveBeenCalled();

    // Add message to the list
    const updatedMessages = [...initialMessages, mockMessage3];
    rerender({messages: updatedMessages});
    jest.advanceTimersByTime(100);

    // Now message should be found and scrolled to
    expect(mockScrollToIndex).toHaveBeenCalledWith(2, {align: 'start'});
  });

  it('should wait 100ms before scrolling (timeout workaround)', () => {
    const setHighlightedMessage = jest.fn();
    const groupedMessages = [mockMessage1, mockMessage2, mockMessage3];

    renderHook(() => useScrollToHighlightedMessage(groupedMessages, 'msg-2', setHighlightedMessage));

    // Before timeout
    jest.advanceTimersByTime(99);
    expect(mockScrollToIndex).not.toHaveBeenCalled();

    // After timeout
    jest.advanceTimersByTime(1);
    expect(mockScrollToIndex).toHaveBeenCalledWith(1, {align: 'start'});
  });

  it('should handle marker at the position of highlighted message', () => {
    const setHighlightedMessage = jest.fn();
    const groupedMessages = [mockMessage1, mockMarker, mockMessage2];

    renderHook(() => useScrollToHighlightedMessage(groupedMessages, 'msg-2', setHighlightedMessage));

    jest.advanceTimersByTime(100);

    // Should find message at index 2, not confused by marker
    expect(mockScrollToIndex).toHaveBeenCalledWith(2, {align: 'start'});
  });
});
