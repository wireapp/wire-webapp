/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {fireEvent, render, waitFor} from '@testing-library/react';

import {CertificateDetailsModal} from './CertificateDetailsModal';

const certificate: string =
  '-----BEGIN CERTIFICATE-----MIICDzCCAbQCCQDzlU3qembswDAKBggqhkjOPQQDAjCBjjELMAkGA1UEBhMCREUxDzANBgNVBAgMBkJlcmxpbjEOMAwGA1UEBwwFTWl0dGUxDTALBgNVBAoMBFdpcmUxFDASBgNVBAsMC0VuZ2luZWVyaW5nMRQwEgYDVQQDDAtjYS53aXJlLmNvbTEjMCEGCSqGSIb3DQEJARYUZW5naW5lZXJpbmdAd2lyZS5jb20wHhcNMjMwNTE2MTcxNjE3WhcNMjMwNjE1MTcxNjE3WjCBjjELMAkGA1UEBhMCREUxDzANBgNVBAgMBkJlcmxpbjEOMAwGA1UEBwwFTWl0dGUxDTALBgNVBAoMBFdpcmUxFDASBgNVBAsMC0VuZ2luZWVyaW5nMRQwEgYDVQQDDAtjYS53aXJlLmNvbTEjMCEGCSqGSIb3DQEJARYUZW5naW5lZXJpbmdAd2lyZS5jb20wWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAASpxQ3hrzh5fPDan+vbcRT8fCQzaz3fIywUNxTRWzvGpPkRPPDegJ7h4G6aUqDfZFgvSsCCaaGaYYVF1di/tuYpMAoGCCqGSM49BAMCA0kAMEYCIQDHAeMUcjjP5J3Mbs3uIlPLd0tZQb0S6bEekXvHsxhYGAIhAKOoeyMqaHxj3qaHnpCBjY/0slt2QUbtDbpF3Lgz2l2S-----END CERTIFICATE';

Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
  },
});

const defaultProps = {
  certificate,
  onClose: jest.fn(),
  downloadCertificate: jest.fn(),
};

describe('CertificateDetailsModal', () => {
  it('is certificate downloaded', async () => {
    const {getByTestId} = render(<CertificateDetailsModal {...defaultProps} />);

    const downloadButton = getByTestId('download-certificate');
    expect(downloadButton).toBeDefined();
    fireEvent.click(downloadButton);

    expect(defaultProps.downloadCertificate).toHaveBeenCalled();
  });

  it('is certificate copied', async () => {
    const {getByText, getByTestId} = render(<CertificateDetailsModal {...defaultProps} />);

    const copyButton = getByTestId('copy-certificate');
    expect(copyButton).toBeDefined();
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(certificate);

    await waitFor(() => {
      expect(getByText('Text copied!')).toBeDefined();
    });
  });
});
