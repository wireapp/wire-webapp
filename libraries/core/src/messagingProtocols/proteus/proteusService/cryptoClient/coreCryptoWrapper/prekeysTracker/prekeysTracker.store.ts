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

type PrekeysState = {
  nbPrekeys: number;
};

let state: PrekeysState = {nbPrekeys: 0};

export class PrekeysTrackerStore {
  private setNbPrekeys(delta: number): number {
    const newNbPrekeys = state.nbPrekeys + delta;
    state = {...state, nbPrekeys: newNbPrekeys};
    return newNbPrekeys;
  }

  /**
   * Will mark one prekey as consumed and decrease the total number of prekeys of 1
   * @returns the number of valid prekeys that are left
   */
  consumePrekey(): number {
    return this.setNbPrekeys(-1);
  }

  /**
   * Will add to the number of prekeys that are stored
   * @param nbIds the number of ids to generate
   */
  addPrekeys(delta: number): number {
    return this.setNbPrekeys(delta);
  }
}
