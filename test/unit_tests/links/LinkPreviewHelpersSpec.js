/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

// grunt test_init && grunt test_run:links/LinkPreviewHelpers

describe('contains_only_link', function() {
  it('should return true if text only contains url (naked domain)', function() {
    const text = 'wire.com';
    expect(z.links.LinkPreviewHelpers.contains_only_link(text)).toBeTruthy();
  });

  it('should return true if text only contains url (http domain)', function() {
    const text = 'http://wire.com';
    expect(z.links.LinkPreviewHelpers.contains_only_link(text)).toBeTruthy();
  });

  it('should return true if text only contains url (https domain)', function() {
    const text = 'https://wire.com';
    expect(z.links.LinkPreviewHelpers.contains_only_link(text)).toBeTruthy();
  });

  it('should ignore leading and trailing whitespaces', function() {
    expect(z.links.LinkPreviewHelpers.contains_only_link(' http://wire.com')).toBeTruthy();
    expect(z.links.LinkPreviewHelpers.contains_only_link('http://wire.com ')).toBeTruthy();
  });

  it('should return false for multiple domains', function() {
    const text = 'http://wire.com http://wire.com';
    expect(z.links.LinkPreviewHelpers.contains_only_link(text)).toBeFalsy();
  });

  it('should return false when text contains domain and other text', function() {
    const text = 'see this http://wire.com';
    expect(z.links.LinkPreviewHelpers.contains_only_link(text)).toBeFalsy();
  });
});

describe('get_first_link_with_offset', function() {
  it('should return undefined for simple text', function() {
    const text = 'foo bar baz';
    expect(z.links.LinkPreviewHelpers.get_first_link_with_offset(text)).not.toBeDefined();
  });

  it('should return correct link and offset for single link without text)', function() {
    const link_preview = z.links.LinkPreviewHelpers.get_first_link_with_offset('wire.com');
    expect(link_preview.offset).toEqual(0);
    expect(link_preview.url).toEqual('wire.com');
  });

  it('should return correct link and offset for single link with text in front)', function() {
    const link_preview = z.links.LinkPreviewHelpers.get_first_link_with_offset('Hey check wire.com');
    expect(link_preview.offset).toEqual(10);
    expect(link_preview.url).toEqual('wire.com');
  });

  it('should return correct link and offset for single link surrounded by text )', function() {
    const link_preview = z.links.LinkPreviewHelpers.get_first_link_with_offset('Hey check wire.com PLEASE!');
    expect(link_preview.offset).toEqual(10);
    expect(link_preview.url).toEqual('wire.com');
  });

  it('should return correct link and offset for single link surrounded by text )', function() {
    const link_preview = z.links.LinkPreviewHelpers.get_first_link_with_offset(
      'wire.com wire.com wire.com wire.com wire.com'
    );
    expect(link_preview.offset).toEqual(0);
    expect(link_preview.url).toEqual('wire.com');
  });
});
