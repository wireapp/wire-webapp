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

import {render, fireEvent, act} from '@testing-library/react';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {useCallAlertState} from 'Components/calling/useCallAlertState';
import {CALL_QUALITY_FEEDBACK_KEY} from 'Components/Modals/QualityFeedbackModal/constants';

import {QualityFeedbackModal} from './QualityFeedbackModal';

import {withIntl, withTheme} from '../../../auth/util/test/TestUtil';
import {User} from '../../../entity/User';
import {UserState} from '../../../user/UserState';

jest.mock('../../../tracking/Countly.helpers', () => ({
  isCountlyEnabledAtCurrentEnvironment: () => true,
}));

describe('QualityFeedbackModal', () => {
  const user = new User('userId', 'domain');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(container.resolve(UserState), 'self').mockReturnValue(user);
  });

  it('should not render if qualityFeedBackModalShown is false', () => {
    const {toggleQualityFeedbackModal} = useCallAlertState.getState();
    toggleQualityFeedbackModal(false);

    const {container} = render(<QualityFeedbackModal />);
    expect(container.firstChild).toBeNull();
  });

  it('should render correctly when qualityFeedBackModalShown is true', () => {
    render(withTheme(withIntl(<QualityFeedbackModal />)));

    act(() => {
      useCallAlertState.getState().toggleQualityFeedbackModal(true);
    });

    expect(useCallAlertState.getState().qualityFeedBackModalShown).toBe(true);
  });

  it('should close modal on skip', () => {
    const {getByText} = render(withTheme(withIntl(<QualityFeedbackModal />)));

    act(() => {
      useCallAlertState.getState().toggleQualityFeedbackModal(true);
    });

    fireEvent.click(getByText('qualityFeedback.skip'));

    // expect(amplify.publish).toHaveBeenCalledWith(WebAppEvents.ANALYTICS.EVENT, {
    //   [EventName.CALLING.QUALITY_REVIEW]: 'DISMISSED',
    // });

    expect(useCallAlertState.getState().qualityFeedBackModalShown).toBe(false);
  });

  it('should send quality feedback and close modal on rating click', () => {
    const {getByText} = render(withTheme(withIntl(<QualityFeedbackModal />)));

    const {toggleQualityFeedbackModal} = useCallAlertState.getState();
    toggleQualityFeedbackModal(true);

    fireEvent.click(getByText('5'));

    expect(amplify.publish).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        'CALL.SCORE': 5,
        'CALL.QUALITY_REVIEW_LABEL': 'ANSWERED',
      }),
    );

    expect(useCallAlertState.getState().qualityFeedBackModalShown).toBe(false);
  });

  it('should store the doNotAskAgain state in localStorage', () => {
    const {getByText} = render(withTheme(withIntl(<QualityFeedbackModal />)));

    act(() => {
      useCallAlertState.getState().toggleQualityFeedbackModal(true);
    });

    const checkbox = getByText('qualityFeedback.doNotAskAgain');
    fireEvent.click(checkbox);
    fireEvent.click(getByText('5'));

    act(() => {
      const storedData = JSON.parse(localStorage.getItem(CALL_QUALITY_FEEDBACK_KEY) || '{}');
      // console.log('[QualityFeedbackModal.test.tsx] przemvs storedData', storedData);
      expect(storedData['userId']).toBeNull();
    });
  });
});
