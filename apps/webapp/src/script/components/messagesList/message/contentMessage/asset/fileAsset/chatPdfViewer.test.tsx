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

import {fireEvent, render, screen} from '@testing-library/react';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../../../page/testSupport/rootContextTestSupport';
import {translateForTest} from '../../../../../../util/test/translateForTest';

import {ChatPdfViewer} from './chatPdfViewer';

describe('ChatPdfViewer', () => {
  const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));

  it('opens the original PDF in an accessible browser viewer', () => {
    render(<ChatPdfViewer src="blob:original-pdf" fileName="report.pdf" />, {wrapper});

    expect(screen.getByTitle('report.pdf')).toHaveAttribute('src', 'blob:original-pdf');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([
    {disposition: 'report', effectiveDirective: 'frame-src', blockedURI: 'blob'},
    {disposition: 'enforce', effectiveDirective: 'img-src', blockedURI: 'blob'},
    {disposition: 'enforce', effectiveDirective: 'frame-src', blockedURI: 'https://unrelated.test'},
  ])('keeps the PDF visible for unrelated or report-only policy events: %p', policy => {
    render(<ChatPdfViewer src="blob:original-pdf" fileName="report.pdf" />, {wrapper});

    fireEvent(document, Object.assign(new Event('securitypolicyviolation'), policy));

    expect(screen.getByTitle('report.pdf')).toHaveAttribute('src', 'blob:original-pdf');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error when the security policy blocks the embedded PDF', () => {
    render(<ChatPdfViewer src="blob:original-pdf" fileName="report.pdf" />, {wrapper});

    fireEvent(
      document,
      Object.assign(new Event('securitypolicyviolation'), {
        disposition: 'enforce',
        effectiveDirective: 'frame-src',
        blockedURI: 'blob',
      }),
    );

    expect(screen.getByText('pdfViewerErrorTitle')).toBeInTheDocument();
    expect(screen.queryByTitle('report.pdf')).not.toBeInTheDocument();
  });
});
