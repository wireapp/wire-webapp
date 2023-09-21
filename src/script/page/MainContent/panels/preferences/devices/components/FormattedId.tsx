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

interface FormattedIdProps {
  idSlices: string[];
}

export function FormattedId({idSlices}: FormattedIdProps) {
  return (
    <>
      {idSlices.map((slice, index) => {
        const Component = index % 2 === 0 ? 'strong' : 'span';

        return (
          <Component className="device-id-part" key={slice + index}>
            {slice}
          </Component>
        );
      })}
    </>
  );
}
