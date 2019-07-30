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

import CryptoJS from 'crypto-js';

import {Logger, getLogger} from 'Util/Logger';
import {encodeSha256Base64, phoneNumberToE164} from 'Util/util';

import {BackendClientError} from '../error/BackendClientError';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {ConnectService} from './ConnectService';
import {ConnectSource} from './ConnectSource';
import {Card, PhoneBook} from './PhoneBook';

interface ContactInformation {
  emails: string[];
  firstName: string;
  lastName: string;
  numbers: string[];
  uid: string;
}

declare global {
  interface Window {
    wAddressBook: {
      getMe(): ContactInformation;
      getContacts(onProgress?: (progress: number) => void, onFinish?: (contacts: ContactInformation[]) => void): void;
    };
  }
}

export class ConnectRepository {
  private readonly logger: Logger;
  readonly connectService: ConnectService;
  readonly propertiesRepository: PropertiesRepository;

  constructor(connectService: ConnectService, propertiesRepository: PropertiesRepository) {
    this.connectService = connectService;
    this.propertiesRepository = propertiesRepository;
    this.logger = getLogger('ConnectRepository');
  }

  /**
   * Get user's contacts for matching.
   * @param source - Source for phone book retrieval
   * @returns Resolves with the matched user IDs
   */
  getContacts(source: ConnectSource): Promise<string[] | {}> {
    return this._getMacosContacts().then(phoneBook => this._uploadContacts(phoneBook, source));
  }

  /**
   * Encode phone book
   *
   * @param phoneBook - Object containing raw phone book data
   * @returns Object containing encoded phone book data
   */
  private _encodePhoneBook(phoneBook: PhoneBook): PhoneBook {
    const {cards, self} = phoneBook;
    self.forEach((contact, contactIndex) => (self[contactIndex] = encodeSha256Base64(contact)));

    cards.forEach((card, cardIndex) => {
      card.contact.forEach((contact, contactIndex) => {
        card.contact[contactIndex] = encodeSha256Base64(contact);
      });
      cards[cardIndex] = card;
    });

    return phoneBook;
  }

  /**
   * Retrieve a user's macOS address book contacts.
   * @returns Resolves with the user's address book contacts that match on Wire
   */
  private _getMacosContacts(): Promise<PhoneBook> {
    return this._parseMacosContacts();
  }

  /**
   * Parse a user's macOS address book Contacts.
   * @returns Resolves with encoded phone book data
   */
  private _parseMacosContacts(): Promise<PhoneBook> {
    return new Promise((resolve, reject) => {
      if (!window.wAddressBook) {
        return reject(new z.error.ConnectError(z.error.ConnectError.TYPE.NOT_SUPPORTED));
      }
      const addressBook = window.wAddressBook;
      const phoneBook = new PhoneBook();

      const {numbers: selfNumbers} = addressBook.getMe();
      selfNumbers.forEach(number => phoneBook.self.push(number));

      addressBook.getContacts(
        percentage => {
          this.logger.info('Importing Contacts', percentage);
        },
        contacts => {
          contacts.forEach(({firstName, lastName, numbers}) => {
            const card: Card = {
              card_id: CryptoJS.MD5(`${firstName}${lastName}`).toString(),
              contact: [],
            };

            numbers.forEach(number => card.contact.push(phoneNumberToE164(number, navigator.language)));

            if (card.contact.length) {
              phoneBook.cards.push(card);
            }
          });

          return resolve(this._encodePhoneBook(phoneBook));
        },
      );
    });
  }

  /**
   * Upload hashed phone booked to backend for matching.
   *
   * @param phoneBook Encoded phone book data
   * @param source Source of phone book data
   */
  private _uploadContacts(phoneBook: PhoneBook, source: ConnectSource): string[] | {} {
    const cards = phoneBook.cards;

    if (!cards.length) {
      this.logger.warn('No contacts found for upload');
      throw new z.error.ConnectError(z.error.ConnectError.TYPE.NO_CONTACTS);
    }

    this.logger.info(`Uploading hashes of '${cards.length}' contacts for matching`, phoneBook);
    return this.connectService
      .postOnboarding(phoneBook)
      .then(({results}) => {
        this.logger.info(`Upload of '${source}' contacts upload successful: ${results.length} matches`, results);
        return results.map((result: {id: string}) => result.id);
      })
      .catch(error => {
        switch (error.type) {
          case z.error.ConnectError.TYPE.NO_CONTACTS:
            return {};
          default:
            if (error.code === BackendClientError.STATUS_CODE.TOO_MANY_REQUESTS) {
              this.logger.error(`Backend refused upload of '${source}' contacts: Endpoint used too frequent`, error);
            } else {
              this.logger.error(`Upload of '${source}' contacts failed`, error);
            }
            throw new z.error.ConnectError(z.error.ConnectError.TYPE.UPLOAD);
        }
      });
  }
}
