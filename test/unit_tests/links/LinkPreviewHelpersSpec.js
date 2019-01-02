/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

describe('containsOnlyLink', () => {
  it('should return true if text only contains a bare url', () => {
    const text = 'wire.com';

    expect(z.links.LinkPreviewHelpers.containsOnlyLink(text)).toBe(true);
  });

  it('should return true if text only contains an http url', () => {
    const text = 'http://wire.com';

    expect(z.links.LinkPreviewHelpers.containsOnlyLink(text)).toBe(true);
  });

  it('should return true if text only contains an https url', () => {
    const text = 'https://wire.com';

    expect(z.links.LinkPreviewHelpers.containsOnlyLink(text)).toBe(true);
  });

  it('should ignore leading and trailing whitespaces', () => {
    expect(z.links.LinkPreviewHelpers.containsOnlyLink(' http://wire.com')).toBe(true);
    expect(z.links.LinkPreviewHelpers.containsOnlyLink('http://wire.com ')).toBe(true);
  });

  it('should return false for multiple domains', () => {
    const text = 'http://wire.com http://wire.com';

    expect(z.links.LinkPreviewHelpers.containsOnlyLink(text)).toBe(false);
  });

  it('should return false when text contains a domain and other text', () => {
    const text = 'see this http://wire.com';

    expect(z.links.LinkPreviewHelpers.containsOnlyLink(text)).toBe(false);
  });

  it('should return false when text contains a domain in a code block', () => {
    const text = '`see this http://wire.com`';

    expect(z.links.LinkPreviewHelpers.containsOnlyLink(text)).toBe(false);
  });
});

describe('getFirstLinkWithOffset', () => {
  it('should not return anything for a simple text', () => {
    const text = 'foo bar baz';

    expect(z.links.LinkPreviewHelpers.getFirstLinkWithOffset(text)).toBeUndefined();
  });

  it('should not return anything for links in code blocks', () => {
    const singleTick = 'cool code: `wire.com`';
    const moreTicks = 'cool code: ```\nwire.com\n```';
    const manyTicks = 'cool code: ``````\nwire.com\n``````';

    expect(z.links.LinkPreviewHelpers.getFirstLinkWithOffset(singleTick)).toBeUndefined();
    expect(z.links.LinkPreviewHelpers.getFirstLinkWithOffset(moreTicks)).toBeUndefined();
    expect(z.links.LinkPreviewHelpers.getFirstLinkWithOffset(manyTicks)).toBeUndefined();
  });

  it('should return the correct link and offset for a single link without text)', () => {
    const link_preview = z.links.LinkPreviewHelpers.getFirstLinkWithOffset('wire.com');

    expect(link_preview.offset).toEqual(0);
    expect(link_preview.url).toEqual('wire.com');
  });

  it('should return the correct link and offset for a single link with text in front)', () => {
    const link_preview = z.links.LinkPreviewHelpers.getFirstLinkWithOffset('Hey check wire.com');

    expect(link_preview.offset).toEqual(10);
    expect(link_preview.url).toEqual('wire.com');
  });

  it('should return the correct link and offset for a single link surrounded by text)', () => {
    const link_preview = z.links.LinkPreviewHelpers.getFirstLinkWithOffset('Hey check wire.com PLEASE!');

    expect(link_preview.offset).toEqual(10);
    expect(link_preview.url).toEqual('wire.com');
  });

  it('should return the correct link and offset for a single link surrounded by text)', () => {
    const link_preview = z.links.LinkPreviewHelpers.getFirstLinkWithOffset(
      'wire.com wire.com wire.com wire.com wire.com'
    );

    expect(link_preview.offset).toEqual(0);
    expect(link_preview.url).toEqual('wire.com');
  });
});
