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

import {containsOnlyLink, getFirstLinkWithOffset} from './helpers';

describe('containsOnlyLink', () => {
  it('should return true if text only contains a bare url', () => {
    const text = 'wire.com';

    expect(containsOnlyLink(text)).toBe(true);
  });

  it('should return true if text only contains an http url', () => {
    const text = 'http://wire.com';

    expect(containsOnlyLink(text)).toBe(true);
  });

  it('should return true if text only contains an https url', () => {
    const text = 'https://wire.com';

    expect(containsOnlyLink(text)).toBe(true);
  });

  it('should ignore leading and trailing whitespaces', () => {
    expect(containsOnlyLink(' http://wire.com')).toBe(true);
    expect(containsOnlyLink('http://wire.com ')).toBe(true);
  });

  it('should return false for multiple domains', () => {
    const text = 'http://wire.com http://wire.com';

    expect(containsOnlyLink(text)).toBe(false);
  });

  it('should return false when text contains a domain and other text', () => {
    const text = 'see this http://wire.com';

    expect(containsOnlyLink(text)).toBe(false);
  });

  it('should return false when text contains a domain in a code block', () => {
    const text = '`see this http://wire.com`';

    expect(containsOnlyLink(text)).toBe(false);
  });
});

describe('getFirstLinkWithOffset', () => {
  it('should not return anything for a simple text', () => {
    const text = 'foo bar baz';

    expect(getFirstLinkWithOffset(text)).toBeUndefined();
  });

  it('should not return anything for links in code blocks', () => {
    const singleTick = 'cool code: `wire.com`';
    const moreTicks = 'cool code: ```\nwire.com\n```';
    const manyTicks = 'cool code: ``````\nwire.com\n``````';
    const multilineSingleTick = '\ncool code:\n`wire.com`';
    const multilineManyTicks = '\ncool code:\n```wire.com\nsome more code\n```';
    const noClosingTicks = 'cool code: ```\nwire.com';
    const ticksception = "cool code: ```\nwire.com `it's a trap!`\n```";

    expect(getFirstLinkWithOffset(singleTick)).toBeUndefined();
    expect(getFirstLinkWithOffset(moreTicks)).toBeUndefined();
    expect(getFirstLinkWithOffset(manyTicks)).toBeUndefined();
    expect(getFirstLinkWithOffset(multilineSingleTick)).toBeUndefined();
    expect(getFirstLinkWithOffset(multilineManyTicks)).toBeUndefined();
    expect(getFirstLinkWithOffset(noClosingTicks)).toBeUndefined();
    expect(getFirstLinkWithOffset(ticksception)).toBeUndefined();
  });

  it('should return the correct link and offset for a single link without text', () => {
    const link = getFirstLinkWithOffset('wire.com');

    expect(link.offset).toEqual(0);
    expect(link.url).toEqual('wire.com');
  });

  it('should return the correct link and offset for a single link with text in front', () => {
    const link = getFirstLinkWithOffset('Hey check wire.com');

    expect(link.offset).toEqual(10);
    expect(link.url).toEqual('wire.com');
  });

  it('should return the correct link and offset for a single link surrounded by text', () => {
    const Link = getFirstLinkWithOffset('Hey check wire.com PLEASE!');

    expect(Link.offset).toEqual(10);
    expect(Link.url).toEqual('wire.com');
  });

  it('should return the correct link and offset for a single link preceded by a code block', () => {
    const Link = getFirstLinkWithOffset('```\ntrap.com `extra trap!`\n```\nwire.com');

    expect(Link.offset).toEqual(1);
    expect(Link.url).toEqual('wire.com');
  });

  it('should return the correct link and offset for a single link followed by a code block', () => {
    const Link = getFirstLinkWithOffset('wire.com\n```\ntrap.com `extra trap!`\n```');

    expect(Link.offset).toEqual(0);
    expect(Link.url).toEqual('wire.com');
  });

  it('should return the correct link and offset for multiple links', () => {
    const link_preview = getFirstLinkWithOffset('wire.com wire.com wire.com wire.com wire.com');

    expect(link_preview.offset).toEqual(0);
    expect(link_preview.url).toEqual('wire.com');
  });

  it('ignores mailto link', () => {
    const Link = getFirstLinkWithOffset('mailto:person@wire.com wire.com');

    expect(Link.offset).toEqual(23);
    expect(Link.url).toEqual('wire.com');
  });
});
