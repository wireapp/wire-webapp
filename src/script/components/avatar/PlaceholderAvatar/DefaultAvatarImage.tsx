/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

export function DefaultAvatarImageSmall({diameter}: {diameter: number}) {
  return (
    <svg width={diameter} height={diameter} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        <path d="M14 28c7.732 0 14-6.268 14-14S21.732 0 14 0 0 6.268 0 14s6.268 14 14 14Z" fill="#fff" />
        <path d="M13.939 17.795a5.849 5.849 0 1 0 0-11.697 5.849 5.849 0 0 0 0 11.697Z" fill="#DCE0E3" />
        <path
          d="M21.82 12.442c0-.755-.09-8.16-7.58-8.683-8.543-.601-8.432 9.427-8.2 12.594a1.057 1.057 0 0 0 1.022.945h4.464a5.84 5.84 0 0 1-3.22-3.858 6.76 6.76 0 0 1-.132-.713l5.613-.185a2.848 2.848 0 0 0 2.667-2.137l.158.353a2.87 2.87 0 0 0 2.556 1.7h.611a5.848 5.848 0 0 1-3.383 4.83h4.443a1.022 1.022 0 0 0 1.022-.977c.066-1.29.052-2.582-.042-3.87Z"
          fill="#676B71"
        />
        <path
          d="M17.203 18.542a13.367 13.367 0 0 1 5.685 2.286c.253.171 1.85 1.394 2.124 2.085-1.216 2.039-2.655 3.014-4.29 4.122-.45.305-.915.62-1.395.97l-2.904.815-4.041.222-3.153-.923c-2.005-.85-3.68-1.956-5.124-3.713.025-.065.04-.11.051-.143a.771.771 0 0 1 .117-.23c.008-.018.019-.047.032-.085.201-.564 1.13-3.174 6.867-4.56a6.655 6.655 0 0 0 2.936.32 6.834 6.834 0 0 0 2.811-.989l.284-.177Z"
          fill="#CBCED1"
        />
        <path
          d="M27.5 14c0 7.456-6.044 13.5-13.5 13.5S.5 21.456.5 14 6.544.5 14 .5 27.5 6.544 27.5 14Z"
          stroke="#DCE0E3"
        />
      </g>
    </svg>
  );
}

export function DefaultAvatarImageLarge({diameter}: {diameter: number}) {
  return (
    <svg width={diameter} height={diameter} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(-.584)">
        <path
          d="M100.965 200c55.228 0 100-44.772 100-100s-44.772-100-100-100c-55.229 0-100 44.772-100 100s44.771 100 100 100Z"
          fill="#fff"
        />
        <path
          d="M100.52 127.111c23.073 0 41.778-18.704 41.778-41.778 0-23.073-18.705-41.777-41.778-41.777S58.742 62.26 58.742 85.334c0 23.073 18.705 41.777 41.778 41.777z"
          fill="#dce0e3"
        />
        <path
          d="M156.822 88.87c0-5.39-.64-58.285-54.133-62.018-61.022-4.297-60.231 67.335-58.575 89.955a7.544 7.544 0 0 0 2.382 4.753 7.522 7.522 0 0 0 4.921 1.996h31.885a41.711 41.711 0 0 1-14.61-11.178 41.79 41.79 0 0 1-8.39-16.382 48.248 48.248 0 0 1-.942-5.09l40.092-1.319a20.345 20.345 0 0 0 12.059-4.461 20.402 20.402 0 0 0 6.989-10.808l1.129 2.526A20.494 20.494 0 0 0 127 85.566a20.454 20.454 0 0 0 10.886 3.418h4.367a41.772 41.772 0 0 1-7.417 20.527 41.682 41.682 0 0 1-16.751 13.97h31.735a7.3 7.3 0 0 0 5.048-2.021 7.322 7.322 0 0 0 2.255-4.954 224.91 224.91 0 0 0-.301-27.635z"
          fill="#676b71"
        />
        <path
          d="M123.854 132.444c14.438 2.154 28.288 7.722 40.605 16.326 1.809 1.224 13.215 9.959 15.171 14.897-8.684 14.563-18.964 21.526-30.646 29.439-3.215 2.178-6.536 4.427-9.959 6.927l-20.745 5.825-28.867 1.586-22.517-6.595c-14.32-6.073-26.285-13.971-36.6-26.522.175-.463.282-.777.363-1.016.213-.621.25-.73.837-1.644.058-.132.131-.337.228-.608 1.434-4.027 8.072-22.671 49.051-32.574a47.54 47.54 0 0 0 20.969 2.282c7.057-.821 13.889-3.222 20.079-7.057z"
          fill="#cbced1"
        />
        <path
          d="M200.465 100c0 54.952-44.548 99.5-99.5 99.5-54.953 0-99.5-44.548-99.5-99.5S46.012.5 100.965.5c54.952 0 99.5 44.548 99.5 99.5z"
          stroke="#dce0e3"
        />
      </g>
    </svg>
  );
}
