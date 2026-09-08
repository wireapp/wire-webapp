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

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {FileDropzoneOverlay} from './fileDropzoneOverlay';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

const renderOverlay = (mode: 'upload' | 'restricted') =>
  render(
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <FileDropzoneOverlay isActive mode={mode} />
    </StyledApp>,
    {wrapper: rootProviderWrapper},
  );

describe('FileDropzoneOverlay', () => {
  it('announces how to upload files while hiding the decorative icon', () => {
    const {container} = renderOverlay('upload');

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('conversationFileUploadOverlayTitle')).toBeInTheDocument();
    expect(screen.getByText('conversationFileUploadOverlayDescription')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('announces why files cannot be shared while hiding the decorative icon', () => {
    const {container} = renderOverlay('restricted');

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('conversationFileUploadRestrictedOverlayTitle')).toBeInTheDocument();
    expect(screen.getByText('conversationFileUploadRestrictedOverlayDescription')).toBeInTheDocument();
    expect(screen.queryByText('conversationFileUploadOverlayTitle')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
