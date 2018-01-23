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

class LRUCache {
  private map: Object;
  private head: any;
  private end: any;

  constructor(private capacity: number = 100) {
    this.map = {};
  }

  public delete(key: string): boolean {
    let node: any = (<any>this.map)[key];

    if (node) {
      this.remove(node);
      delete (<any>this.map)[node.key];
      return true;
    } else {
      return false;
    }
  }

  public get(key: string): any {
    let node: any = (<any>this.map)[key];
    if (node) {
      this.remove(node);
      this.setHead(node);
      return node.value;
    }
  }

  public keys(): Array<string> {
    let keys: Array<string> = [];
    let entry: any = this.head;

    while (entry) {
      keys.push(entry.key);
      entry = entry.next;
    }

    return keys;
  }

  public latest(): any {
    return this.head.value;
  }

  public oldest(): any {
    return this.end.value;
  }

  private remove(node: any): any {
    if (node.previous) {
      node.previous.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next != null) {
      node.next.previous = node.previous;
    } else {
      this.end = node.previous;
    }

    return node;
  }

  public set(key: string, value: any): Object {
    let old: any = (<any>this.map)[key];
    let removedNode: any = {
      key: undefined,
      value: undefined,
    };

    if (old) {
      old.value = value;
      removedNode = this.remove(old);
      this.setHead(old);
      return removedNode.value;
    } else {
      let created: any = {
        key: key,
        value: value,
      };

      if (Object.keys(this.map).length >= this.capacity) {
        delete (<any>this.map)[this.end.key];
        removedNode = this.remove(this.end);
        this.setHead(created);
      } else {
        this.setHead(created);
      }

      (<any>this.map)[key] = created;
      return removedNode.value;
    }
  }

  private setHead(node: any) {
    node.next = this.head;
    node.previous = null;

    if (this.head) {
      this.head.previous = node;
    }

    this.head = node;

    if (!this.end) {
      this.end = this.head;
    }
  }

  public size(): number {
    return Object.keys(this.map).length;
  }

  public toString(): string {
    let string: string = '(newest) ';
    let entry: any = this.head;

    while (entry) {
      string += `${String(entry.key)}:${entry.value}`;
      entry = entry.next;
      if (entry) {
        string += ' > ';
      }
    }

    return `${string} (oldest)`;
  }
}

export default LRUCache;
