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

import {sanitizeUrl, validateUrl, URL_REGEX} from './url';

describe('sanitizeUrl', () => {
  test('should return the same URL if it has a supported protocol', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    expect(sanitizeUrl('mailto:user@example.com')).toBe('mailto:user@example.com');
    expect(sanitizeUrl('sms:+123456789')).toBe('sms:+123456789');
    expect(sanitizeUrl('tel:+123456789')).toBe('tel:+123456789');
  });

  test('should add https:// if missing', () => {
    expect(sanitizeUrl('example.com')).toBe('https://example.com');
    expect(sanitizeUrl('www.example.com')).toBe('https://www.example.com');
  });

  test('should return an empty string for unsupported protocols', () => {
    expect(sanitizeUrl('ftp://example.com')).toBe('');
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==')).toBe('');
  });
});

describe('validateUrl', () => {
  test('should return true for valid URLs', () => {
    expect(validateUrl('https://example.com')).toBe(true);
    expect(validateUrl('http://example.com')).toBe(true);
    expect(validateUrl('https://sub.domain.co.uk/path?query=1#hash')).toBe(true);
  });

  test('should return false for invalid URLs', () => {
    expect(validateUrl('ftp://example.com')).toBe(false);
    expect(validateUrl('javascript:alert(1)')).toBe(false);
    expect(validateUrl('')).toBe(false);
    expect(validateUrl('example.com')).toBe(false);
  });

  test('should allow only "https://" as a valid empty URL', () => {
    expect(validateUrl('https://')).toBe(true);
    expect(validateUrl('http://')).toBe(false);
  });

  test('should match valid URLs with URL_REGEX', () => {
    expect(URL_REGEX.test('https://valid.com')).toBe(true);
    expect(URL_REGEX.test('http://valid.com')).toBe(true);
    expect(URL_REGEX.test('https://sub.domain/path?query=1')).toBe(true);
    expect(URL_REGEX.test('https://example.com,')).toBe(true);
  });

  test('should reject invalid URLs with URL_REGEX', () => {
    expect(URL_REGEX.test('ftp://invalid.com')).toBe(false);
    expect(URL_REGEX.test('javascript:alert(1)')).toBe(false);
    expect(URL_REGEX.test('data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==')).toBe(false);
    expect(URL_REGEX.test('://missing.protocol')).toBe(false);
  });
});
