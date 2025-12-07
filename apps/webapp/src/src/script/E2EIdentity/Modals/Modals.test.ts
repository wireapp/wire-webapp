/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {PrimaryModal} from 'Components/Modals/PrimaryModal';

import {getModalOptions, ModalType} from './Modals';

describe('getModalOptions', () => {
  it('should return modal options with hidden secondary action when hideSecondary is true', () => {
    const options = getModalOptions({type: ModalType.ENROLL, hideSecondary: true});

    expect(options.modalOptions.secondaryAction).toBeUndefined();
    expect(options.modalType).toEqual(PrimaryModal.type.ACKNOWLEDGE);
  });

  it('should return modal options with hidden secondary action when secondaryActionFn is not provided', () => {
    const options = getModalOptions({type: ModalType.ENROLL, secondaryActionFn: undefined});

    expect(options.modalOptions.secondaryAction).toBeUndefined();
    expect(options.modalType).toEqual(PrimaryModal.type.ACKNOWLEDGE);
  });

  it('should return modal options with hidden primary action when hidePrimary is true', () => {
    const options = getModalOptions({type: ModalType.ENROLL, hidePrimary: true});

    expect(options.modalOptions.primaryAction).toBeUndefined();
  });

  it('should return modal options with hidden close button when hideClose is true', () => {
    const options = getModalOptions({type: ModalType.ENROLL, hideClose: true});

    expect(options.modalOptions.hideCloseBtn).toBeTruthy();
    expect(options.modalOptions.preventClose).toBeTruthy();
  });

  it('should return modal options with hidden secondary and primary actions when both hideSecondary and hidePrimary are true', () => {
    const options = getModalOptions({type: ModalType.ENROLL, hideSecondary: true, hidePrimary: true});

    expect(options.modalOptions.secondaryAction).toBeUndefined();
    expect(options.modalOptions.primaryAction).toBeUndefined();
  });

  // Add more test cases as needed to cover different combinations of hide functionality
});
