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

import {render, screen} from '@testing-library/react';

import {withTheme} from 'src/script/auth/util/test/TestUtil';

import {
  CellsShareExpirationFields,
  CellsShareExpirationSelection,
  getNextHourDateTime,
} from './CellsShareExpirationFields';

const defaultLabels = {
  expiresLabel: 'Expires',
  dateAriaLabel: 'Select date',
  timeAriaLabel: 'Select time',
  openCalendarLabel: 'Open calendar',
  previousMonthLabel: 'Previous month',
  nextMonthLabel: 'Next month',
};

const defaultErrorText = 'The expiration date must be in the future';

describe('CellsShareExpirationFields', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getNextHourDateTime', () => {
    it('returns a date +1 hour from now', () => {
      const fixedTime = new Date('2025-01-21T10:30:00');
      jest.setSystemTime(fixedTime);

      const result = getNextHourDateTime();

      expect(result.getHours()).toBe(11);
      expect(result.getMinutes()).toBe(30);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(21);
    });

    it('handles day boundary correctly (23:30 → 00:30 next day)', () => {
      const fixedTime = new Date('2025-01-21T23:30:00');
      jest.setSystemTime(fixedTime);

      const result = getNextHourDateTime();

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(30);
      expect(result.getDate()).toBe(22); // Next day
    });

    it('handles month boundary correctly', () => {
      const fixedTime = new Date('2025-01-31T23:30:00');
      jest.setSystemTime(fixedTime);

      const result = getNextHourDateTime();

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(30);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(1);
    });
  });

  describe('rendering', () => {
    it('renders with default +1 hour from now when no dateTime prop is provided', () => {
      const fixedTime = new Date('2025-01-21T10:30:00');
      jest.setSystemTime(fixedTime);

      const onChangeMock = jest.fn();
      render(
        withTheme(
          <CellsShareExpirationFields labels={defaultLabels} errorText={defaultErrorText} onChange={onChangeMock} />,
        ),
      );

      expect(screen.getByText('Expires')).toBeInTheDocument();
      expect(screen.getByLabelText('Select date')).toBeInTheDocument();
      expect(screen.getByLabelText('Select time')).toBeInTheDocument();
    });

    it('renders with provided dateTime prop when given', () => {
      const fixedTime = new Date('2025-01-21T10:00:00');
      jest.setSystemTime(fixedTime);

      const providedDateTime = new Date('2025-01-25T15:30:00');
      const onChangeMock = jest.fn();

      render(
        withTheme(
          <CellsShareExpirationFields
            labels={defaultLabels}
            errorText={defaultErrorText}
            dateTime={providedDateTime}
            onChange={onChangeMock}
          />,
        ),
      );

      expect(screen.getByText('Expires')).toBeInTheDocument();
    });

    it('renders calendar button with correct aria-label', () => {
      const fixedTime = new Date('2025-01-21T10:00:00');
      jest.setSystemTime(fixedTime);

      render(withTheme(<CellsShareExpirationFields labels={defaultLabels} errorText={defaultErrorText} />));

      expect(screen.getByLabelText('Open calendar')).toBeInTheDocument();
    });
  });

  describe('onChange callback', () => {
    it('calls onChange with correct values when component mounts with no dateTime prop', () => {
      const fixedTime = new Date('2025-01-21T10:30:00');
      jest.setSystemTime(fixedTime);

      const onChangeMock = jest.fn();
      render(
        withTheme(
          <CellsShareExpirationFields labels={defaultLabels} errorText={defaultErrorText} onChange={onChangeMock} />,
        ),
      );

      expect(onChangeMock).toHaveBeenCalled();
      const lastCall = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0] as CellsShareExpirationSelection;
      expect(lastCall.dateTime).not.toBeNull();
      expect(lastCall.date).not.toBeNull();
      expect(lastCall.time).not.toBeNull();
      expect(lastCall.isInvalid).toBe(false);
    });

    it('calls onChange with dateTime +1 hour from now when no dateTime prop', () => {
      const fixedTime = new Date('2025-01-21T10:30:00');
      jest.setSystemTime(fixedTime);

      const onChangeMock = jest.fn();
      render(
        withTheme(
          <CellsShareExpirationFields labels={defaultLabels} errorText={defaultErrorText} onChange={onChangeMock} />,
        ),
      );

      expect(onChangeMock).toHaveBeenCalled();
      const lastCall = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0] as CellsShareExpirationSelection;

      // The default should be +1 hour from the fixed time (11:30)
      expect(lastCall.dateTime?.getHours()).toBe(11);
      expect(lastCall.dateTime?.getMinutes()).toBe(30);
    });

    it('calls onChange with provided dateTime when given', () => {
      const fixedTime = new Date('2025-01-21T10:00:00');
      jest.setSystemTime(fixedTime);

      const providedDateTime = new Date('2025-01-25T15:30:00');
      const onChangeMock = jest.fn();

      render(
        withTheme(
          <CellsShareExpirationFields
            labels={defaultLabels}
            errorText={defaultErrorText}
            dateTime={providedDateTime}
            onChange={onChangeMock}
          />,
        ),
      );

      expect(onChangeMock).toHaveBeenCalled();
      const lastCall = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0] as CellsShareExpirationSelection;

      expect(lastCall.dateTime?.getFullYear()).toBe(2025);
      expect(lastCall.dateTime?.getMonth()).toBe(0); // January
      expect(lastCall.dateTime?.getDate()).toBe(25);
      expect(lastCall.dateTime?.getHours()).toBe(15);
      expect(lastCall.dateTime?.getMinutes()).toBe(30);
    });

    it('does not throw when onChange prop is not provided', () => {
      const fixedTime = new Date('2025-01-21T10:00:00');
      jest.setSystemTime(fixedTime);

      // Should not throw when onChange is not provided
      expect(() => {
        render(withTheme(<CellsShareExpirationFields labels={defaultLabels} errorText={defaultErrorText} />));
      }).not.toThrow();
    });
  });

  describe('day boundary handling', () => {
    it('correctly handles +1 hour across day boundary (23:30 → 00:30 next day)', () => {
      const fixedTime = new Date('2025-01-21T23:30:00');
      jest.setSystemTime(fixedTime);

      const onChangeMock = jest.fn();
      render(
        withTheme(
          <CellsShareExpirationFields labels={defaultLabels} errorText={defaultErrorText} onChange={onChangeMock} />,
        ),
      );

      expect(onChangeMock).toHaveBeenCalled();
      const lastCall = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0] as CellsShareExpirationSelection;

      // Should be 00:30 on January 22nd
      expect(lastCall.dateTime?.getHours()).toBe(0);
      expect(lastCall.dateTime?.getMinutes()).toBe(30);
      expect(lastCall.dateTime?.getDate()).toBe(22);
    });
  });

  describe('validation', () => {
    it('marks as invalid when expiration is in the past', () => {
      const fixedTime = new Date('2025-01-21T10:00:00');
      jest.setSystemTime(fixedTime);

      // Provide a dateTime in the past
      const pastDateTime = new Date('2025-01-20T15:30:00');
      const onChangeMock = jest.fn();

      render(
        withTheme(
          <CellsShareExpirationFields
            labels={defaultLabels}
            errorText={defaultErrorText}
            dateTime={pastDateTime}
            onChange={onChangeMock}
          />,
        ),
      );

      expect(onChangeMock).toHaveBeenCalled();
      const lastCall = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0] as CellsShareExpirationSelection;

      expect(lastCall.isInvalid).toBe(true);
    });

    it('shows error text when expiration is invalid', () => {
      const fixedTime = new Date('2025-01-21T10:00:00');
      jest.setSystemTime(fixedTime);

      // Provide a dateTime in the past
      const pastDateTime = new Date('2025-01-20T15:30:00');

      render(
        withTheme(
          <CellsShareExpirationFields labels={defaultLabels} errorText={defaultErrorText} dateTime={pastDateTime} />,
        ),
      );

      expect(screen.getByText(defaultErrorText)).toBeInTheDocument();
    });

    it('does not show error text when expiration is valid', () => {
      const fixedTime = new Date('2025-01-21T10:00:00');
      jest.setSystemTime(fixedTime);

      render(withTheme(<CellsShareExpirationFields labels={defaultLabels} errorText={defaultErrorText} />));

      expect(screen.queryByText(defaultErrorText)).not.toBeInTheDocument();
    });
  });
});
