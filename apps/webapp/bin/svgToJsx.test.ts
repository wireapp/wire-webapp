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

import {convertSvgMarkupToJsx} from './svgToJsx';

describe('convertSvgMarkupToJsx', () => {
  it('converts inline SVG styles into a React style object', () => {
    const svgMarkup =
      '<path style="fill:none;stroke-width:0.857142;paint-order:stroke fill markers;font-family:Arial"></path>';

    const actualJsx = convertSvgMarkupToJsx(svgMarkup);

    expect(actualJsx).toBe(
      '<path style={{"fill": "none", "strokeWidth": "0.857142", "paintOrder": "stroke fill markers", "fontFamily": "Arial"}}></path>',
    );
  });

  it('converts hyphenated SVG attributes without truncating values containing equals signs', () => {
    const svgMarkup = '<path stroke-width="2" href="data:image/svg+xml;base64,abc=="></path>';

    const actualJsx = convertSvgMarkupToJsx(svgMarkup);

    expect(actualJsx).toBe('<path strokeWidth="2" href="data:image/svg+xml;base64,abc=="></path>');
  });

  it('preserves React vendor-prefix casing in inline styles', () => {
    const svgMarkup = '<path style="-webkit-transform:scale(1);-ms-transform:scale(1)"></path>';

    const actualJsx = convertSvgMarkupToJsx(svgMarkup);

    expect(actualJsx).toBe('<path style={{"WebkitTransform": "scale(1)", "msTransform": "scale(1)"}}></path>');
  });

  it('preserves delimiters inside inline style values', () => {
    const svgMarkup = `<path style="fill:url('data:image/svg+xml;utf8,icon:value');font-family:'A; B'"></path>`;

    const actualJsx = convertSvgMarkupToJsx(svgMarkup);

    expect(actualJsx).toBe(
      `<path style={{"fill": "url('data:image/svg+xml;utf8,icon:value')", "fontFamily": "'A; B'"}}></path>`,
    );
  });
});
