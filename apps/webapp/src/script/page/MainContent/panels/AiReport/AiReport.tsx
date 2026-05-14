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

const CAT_ASCII = `
  /\\_____/\\
 /  o   o  \\
( ==  ^  == )
 )         (
(           )
 ( (     ) )
  ((_)   (_))
`;

export const AiReport = () => {
  return (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <pre
        style={{
          fontFamily: 'monospace',
          fontSize: '1.2rem',
          lineHeight: 1.4,
          margin: 0,
          textAlign: 'center',
          whiteSpace: 'pre',
        }}
      >
        {CAT_ASCII}
      </pre>
      <p style={{fontSize: '1rem', marginTop: '1rem', opacity: 0.6}}>AI Report</p>
    </div>
  );
};
