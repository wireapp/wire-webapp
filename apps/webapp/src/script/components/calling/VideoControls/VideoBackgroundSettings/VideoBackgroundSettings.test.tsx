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
import {translateForTest} from 'Util/test/translateForTest';
import {createRootContextValueForTest, createRootProviderWrapperForTest} from 'src/script/page/testSupport/rootContextTestSupport';
import {withTheme} from '../../../../auth/util/test/TestUtil';

import {getBackgroundEffectLabel, VideoBackgroundSettings} from './VideoBackgroundSettings';

const rootProviderWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));

describe('VideoBackgroundSettings', () => {
  const backgrounds = [
    {
      id: 'office',
      imageUrl: 'office.jpg',
      labelKey: 'videoCallBackgroundOffice1',
      previewGradient: 'linear-gradient(red, blue)',
    },
    {
      id: 'beach',
      imageUrl: 'beach.jpg',
      labelKey: 'videoCallBackgroundOffice2',
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
    isWebGLAvailable: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(withTheme(<VideoBackgroundSettings {...defaultProps} {...props} />), {wrapper: rootProviderWrapper});
  };

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

    expect(getByText('videoCallBackgroundBlurHigh').closest('button')).toHaveAttribute('aria-checked', 'true');
  });

  it('selects a virtual background', () => {
    const {getByRole} = renderComponent();

    fireEvent.click(getByRole('radio', {name: /office1/i}));

    expect(defaultProps.onSelectEffect).toHaveBeenCalledWith({
      type: 'virtual',
      backgroundId: 'office',
    });
  });

  it('marks selected virtual background tile as pressed', () => {
    const {getByRole} = renderComponent({
      selectedEffect: {type: 'virtual', backgroundId: 'beach'},
    });

    const secondVirtualBackgroundButton = getByRole('radio', {name: /office2/i});

    expect(secondVirtualBackgroundButton).toHaveAttribute('aria-checked', 'true');
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

    expect(getByText('videoCallBackgroundNoEffect').closest('button')).toHaveAttribute('aria-checked', 'true');
  });

  it('marks selected low blur tile as pressed', () => {
    const {getByText} = renderComponent({
      selectedEffect: {type: 'blur', level: 'low'},
    });

    expect(getByText('videoCallBackgroundBlurLow').closest('button')).toHaveAttribute('aria-checked', 'true');
  });

  it('does not render virtual background tiles when backgrounds list is empty', () => {
    const {getAllByRole} = renderComponent({
      backgrounds: [],
    });

    // close button
    expect(getAllByRole('button')).toHaveLength(1);
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

    expect(getByText('videoCallBackgroundBlurLow').closest('button')).toHaveAttribute('aria-checked', 'false');
  });

  it('does not mark another virtual background as pressed when one virtual background is selected', () => {
    const {getByRole} = renderComponent({
      selectedEffect: {type: 'virtual', backgroundId: 'beach'},
    });

    const firstVirtualBackgroundButton = getByRole('radio', {name: /office1/i});

    expect(firstVirtualBackgroundButton).toHaveAttribute('aria-checked', 'false');
  });

  it('autofocuses the close button when video background settings opens', () => {
    const {getByRole} = renderComponent();

    expect(getByRole('button', {name: 'modalCloseButton'})).toHaveFocus();
  });

  it('renders no WebGL hint when WebGL is unavailable', () => {
    const {getByText} = renderComponent({isWebGLAvailable: false});

    expect(getByText('videoCallBackgroundNoWebGLHint')).toBeInTheDocument();
  });

  it('does not render blur controls when WebGL is unavailable', () => {
    const {queryByText, queryByTestId} = renderComponent({isWebGLAvailable: false});

    expect(queryByText('videoCallBackgroundBlurSectionLabel')).not.toBeInTheDocument();
    expect(queryByText('videoCallBackgroundBlurLow')).not.toBeInTheDocument();
    expect(queryByText('videoCallBackgroundBlurHigh')).not.toBeInTheDocument();
    expect(queryByTestId('enable-high-quality-blur')).not.toBeInTheDocument();
  });

  it('does not render virtual background tiles when WebGL is unavailable', () => {
    const {queryByRole, queryByText} = renderComponent({isWebGLAvailable: false});

    expect(queryByText('videoCallBackgroundVirtualSectionLabel')).not.toBeInTheDocument();
    expect(queryByRole('radio', {name: /office1/i})).not.toBeInTheDocument();
    expect(queryByRole('radio', {name: /office2/i})).not.toBeInTheDocument();
  });

  it('disables no effect tile when WebGL is unavailable', () => {
    const {getByRole} = renderComponent({isWebGLAvailable: false});

    expect(getByRole('radio', {name: 'videoCallBackgroundNoEffect'})).toBeDisabled();
  });

  it('renders support link in no WebGL hint', () => {
    const {getByText} = renderComponent({
      isWebGLAvailable: false,
    });

    const link = getByText('warningLearnMore').closest('a');

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('target', '_blank');
  });

  describe('getBackgroundEffectLabel', () => {
    it('returns label for no effect', () => {
      expect(getBackgroundEffectLabel({type: 'none'}, backgrounds, translationKey => translationKey)).toBe(
        'videoCallBackgroundNoEffect',
      );
    });

    it('returns label for low blur', () => {
      expect(getBackgroundEffectLabel({type: 'blur', level: 'low'}, backgrounds, translationKey => translationKey)).toBe(
        'videoCallBackgroundBlurLow',
      );
    });

    it('returns label for high blur', () => {
      expect(getBackgroundEffectLabel({type: 'blur', level: 'high'}, backgrounds, translationKey => translationKey)).toBe(
        'videoCallBackgroundBlurHigh',
      );
    });

    it('returns label for matching virtual background', () => {
      expect(
        getBackgroundEffectLabel({type: 'virtual', backgroundId: 'office'}, backgrounds, translationKey => translationKey),
      ).toBe('videoCallBackgroundOffice1');
    });

    it('returns fallback label for unknown virtual background', () => {
      expect(
        getBackgroundEffectLabel({type: 'virtual', backgroundId: 'missing'}, backgrounds, translationKey => translationKey),
      ).toBe('videoCallBackgroundVirtual');
    });

    it('returns label for custom background', () => {
      expect(getBackgroundEffectLabel({type: 'custom'}, backgrounds, translationKey => translationKey)).toBe(
        'videoCallBackgroundCustom',
      );
    });
  });
});
