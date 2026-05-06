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

import {fireEvent, render} from '@testing-library/react';

import type {BuiltinBackground} from 'Repositories/media/VideoBackgroundEffects';
import {withTheme} from '../../../../auth/util/test/TestUtil';

import {VideoBackgroundSettings} from './VideoBackgroundSettings';

jest.mock('Util/localizerUtil', () => ({
  t: (key: string) => key,
}));

describe('VideoBackgroundSettings', () => {
  const backgrounds = [
    {
      id: 'office',
      imageUrl: 'office.jpg',
      previewGradient: 'linear-gradient(red, blue)',
    },
    {
      id: 'beach',
      imageUrl: 'beach.jpg',
      previewGradient: 'linear-gradient(yellow, green)',
    },
  ] as BuiltinBackground[];

  const defaultProps = {
    selectedEffect: {type: 'none'} as const,
    backgrounds,
    onSelectEffect: jest.fn(),
    onEnableHighQualityBlur: jest.fn(),
    onClose: jest.fn(),
    highQualityBlurAllowed: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => render(withTheme(<VideoBackgroundSettings {...defaultProps} {...props} />));

  it('renders video background settings wrapper', () => {
    const {getByTestId} = renderComponent();

    expect(getByTestId('video-background-settings')).toBeInTheDocument();
  });

  it('renders the high quality blur checkbox as unchecked', () => {
    const {getByTestId} = renderComponent();

    const checkbox = getByTestId('enable-high-quality-blur') as HTMLInputElement;

    expect(checkbox).not.toBeChecked();
    expect(checkbox).not.toBeDisabled();
  });

  it('renders the high quality blur checkbox as checked', () => {
    const {getByTestId} = renderComponent({highQualityBlurAllowed: true});

    expect(getByTestId('enable-high-quality-blur')).toBeChecked();
  });

  it('calls onEnableHighQualityBlur when high quality blur checkbox changes', () => {
    const {getByTestId} = renderComponent();

    fireEvent.click(getByTestId('enable-high-quality-blur'));

    expect(defaultProps.onEnableHighQualityBlur).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close modal close button is clicked', () => {
    const {getByTitle} = renderComponent();

    fireEvent.click(getByTitle('modalCloseButton'));

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('selects low blur', () => {
    const {getByText} = renderComponent();

    fireEvent.click(getByText('videoCallBackgroundBlurLow'));

    expect(defaultProps.onSelectEffect).toHaveBeenCalledWith({
      type: 'blur',
      level: 'low',
    });
  });

  it('selects high blur', () => {
    const {getByText} = renderComponent();

    fireEvent.click(getByText('videoCallBackgroundBlurHigh'));

    expect(defaultProps.onSelectEffect).toHaveBeenCalledWith({
      type: 'blur',
      level: 'high',
    });
  });

  it('marks selected high blur tile as pressed', () => {
    const {getByText} = renderComponent({
      selectedEffect: {type: 'blur', level: 'high'},
    });

    expect(getByText('videoCallBackgroundBlurHigh').closest('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('selects a virtual background', () => {
    const {getAllByRole} = renderComponent();

    const firstVirtualBackgroundButton = getAllByRole('button')[4];

    fireEvent.click(firstVirtualBackgroundButton);

    expect(defaultProps.onSelectEffect).toHaveBeenCalledWith({
      type: 'virtual',
      backgroundId: 'office',
    });
  });

  it('marks selected virtual background tile as pressed', () => {
    const {getAllByRole} = renderComponent({
      selectedEffect: {type: 'virtual', backgroundId: 'beach'},
    });

    const secondVirtualBackgroundButton = getAllByRole('button')[5];

    expect(secondVirtualBackgroundButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onSelectEffect with none when no effect tile is clicked', () => {
    const {getByText} = renderComponent();

    fireEvent.click(getByText('videoCallBackgroundNoEffect'));

    expect(defaultProps.onSelectEffect).toHaveBeenCalledWith({
      type: 'none',
    });
  });

  it('marks no effect tile as pressed when none is selected', () => {
    const {getByText} = renderComponent();

    expect(getByText('videoCallBackgroundNoEffect').closest('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks selected low blur tile as pressed', () => {
    const {getByText} = renderComponent({
      selectedEffect: {type: 'blur', level: 'low'},
    });

    expect(getByText('videoCallBackgroundBlurLow').closest('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not render virtual background tiles when backgrounds list is empty', () => {
    const {getAllByRole} = renderComponent({
      backgrounds: [],
    });

    // close button + no effect + low blur + high blur
    expect(getAllByRole('button')).toHaveLength(4);
  });

  it('renders virtual background preview image and fallback gradient', () => {
    const {container} = renderComponent();

    const preview = container.querySelectorAll('.bg-tile__preview')[3] as HTMLElement;

    expect(preview).toHaveStyle({
      backgroundImage: 'url(office.jpg), linear-gradient(red, blue)',
    });
  });

  it('does not mark another blur level as pressed when high blur is selected', () => {
    const {getByText} = renderComponent({
      selectedEffect: {type: 'blur', level: 'high'},
    });

    expect(getByText('videoCallBackgroundBlurLow').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not mark another virtual background as pressed when one virtual background is selected', () => {
    const {getAllByRole} = renderComponent({
      selectedEffect: {type: 'virtual', backgroundId: 'beach'},
    });

    const firstVirtualBackgroundButton = getAllByRole('button')[4];

    expect(firstVirtualBackgroundButton).toHaveAttribute('aria-pressed', 'false');
  });
});
