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

window.z = window.z || {};
window.z.connect = z.connect || {};

z.connect.ConnectRepository = class ConnectRepository {
  constructor(connectService, connectGoogleService, propertiesRepository) {
    this.connectService = connectService;
    this.connectGoogleService = connectGoogleService;
    this.propertiesRepository = propertiesRepository;
    this.logger = new z.util.Logger('z.connect.ConnectRepository', z.config.LOGGER.OPTIONS);
  }

  /**
   * Get user's contacts for matching.
   * @param {z.connect.ConnectSource} source - Source for phone book retrieval
   * @returns {Promise} Resolves with the matched user IDs
   */
  getContacts(source) {
    const importFromIcloud = source === z.connect.ConnectSource.ICLOUD;

    const importPromise = importFromIcloud ? this._getMacosContacts() : this._getGoogleContacts();
    return importPromise.then(phoneBook => this._uploadContacts(phoneBook, source));
  }

  /**
   * Encode phone book
   *
   * @private
   * @param {z.connect.PhoneBook} phoneBook - Object containing un-encoded phone book data
   * @returns {z.connect.PhoneBook} Object containing encoded phone book data
   */
  _encodePhoneBook(phoneBook) {
    const {cards, self} = phoneBook;
    self.forEach((contact, contactIndex) => (self[contactIndex] = z.util.encode_sha256_base64(contact)));

    cards.forEach((card, cardIndex) => {
      card.contact.forEach((contact, contactIndex) => {
        card.contact[contactIndex] = z.util.encode_sha256_base64(contact);
      });
      cards[cardIndex] = card;
    });

    return phoneBook;
  }

  /**
   * Retrieve a user's Google Contacts.
   * @private
   * @returns {Promise} Resolves with the user's Google contacts that match on Wire
   */
  _getGoogleContacts() {
    return this.connectGoogleService
      .getContacts()
      .catch(error => {
        this.logger.info('Google Contacts SDK error', error);
        throw new z.connect.ConnectError(z.connect.ConnectError.TYPE.GOOGLE_DOWNLOAD);
      })
      .then(response => {
        amplify.publish(z.event.WebApp.SEARCH.SHOW);
        return this._parseGoogleContacts(response);
      });
  }

  /**
   * Retrieve a user's macOS address book contacts.
   * @private
   * @returns {Promise} Resolves with the user's address book contacts that match on Wire
   */
  _getMacosContacts() {
    return this._parseMacosContacts();
  }

  /**
   * Parse a user's macOS address book Contacts.
   * @private
   * @returns {Promise} Resolves with encoded phone book data
   */
  _parseMacosContacts() {
    return new Promise((resolve, reject) => {
      if (!window.wAddressBook) {
        return reject(new z.connect.ConnectError(z.connect.ConnectError.TYPE.NOT_SUPPORTED));
      }
      const addressBook = window.wAddressBook;
      const phoneBook = new z.connect.PhoneBook();

      const {numbers: selfNumbers} = addressBook.getMe();
      selfNumbers.forEach(number => phoneBook.self.push(number));

      addressBook.getContacts(
        percentage => {
          this.logger.info('Importing Contacts', percentage);
        },
        contacts => {
          contacts.forEach(({firstName, lastName, numbers}) => {
            const card = {
              card_id: CryptoJS.MD5(`${firstName}${lastName}`).toString(),
              contact: [],
            };

            numbers.forEach(number => card.contact.push(z.util.phone_number_to_e164(number, navigator.language)));

            if (card.contact.length) {
              phoneBook.cards.push(card);
            }
          });

          return resolve(this._encodePhoneBook(phoneBook));
        }
      );
    });
  }

  /**
   * Parse a user's Google Contacts.
   *
   * @private
   * @param {Array} users - Contacts response from Google API
   * @returns {z.connect.PhoneBook} Encoded phone book data
   */
  _parseGoogleContacts({entry: users}) {
    const phoneBook = new z.connect.PhoneBook();

    // Add Google contacts
    if (users) {
      users.forEach(user => {
        if (user.gd$phoneNumber) {
          const card = {
            card_id: user.gd$etag,
            contact: [],
          };

          if (user.gd$phoneNumber) {
            user.gd$phoneNumber.forEach(number => {
              if (number.uri) {
                card.contact.push(number.uri);
              } else {
                card.contact.push(number.$t);
              }
            });
          }

          if (card.contact.length) {
            phoneBook.cards.push(card);
          }
        }
      });
    }

    return this._encodePhoneBook(phoneBook);
  }

  /**
   * Upload hashed phone booked to backend for matching.
   *
   * @private
   * @param {z.connect.PhoneBook} phoneBook - Encoded phone book data
   * @param {z.connect.ConnectSource} source - Source of phone book data
   * @returns {Promise} Resolves when phone book was uploaded
   */
  _uploadContacts(phoneBook, source = z.connect.ConnectSource.GMAIL) {
    const {cards} = phoneBook;

    if (!cards.length) {
      this.logger.warn('No contacts found for upload');
      throw new z.connect.ConnectError(z.connect.ConnectError.TYPE.NO_CONTACTS);
    }

    this.logger.info(`Uploading hashes of '${cards.length}' contacts for matching`, phoneBook);
    return this.connectService
      .postOnboarding(phoneBook)
      .then(({results}) => {
        this.logger.info(`Upload of '${source}' contacts upload successful: ${results.length} matches`, results);
        this.propertiesRepository.savePreference(z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.GOOGLE);
        return results.map(result => result.id);
      })
      .catch(error => {
        switch (error.type) {
          case z.connect.ConnectError.TYPE.GOOGLE_DOWNLOAD:
            throw error;
          case z.connect.ConnectError.TYPE.NO_CONTACTS:
            return {};
          default:
            if (error.code === z.service.BackendClientError.STATUS_CODE.TOO_MANY_REQUESTS) {
              this.logger.error(`Backend refused upload of '${source}' contacts: Endpoint used too frequent`, error);
            } else {
              this.logger.error(`Upload of '${source}' contacts failed`, error);
            }
            throw new z.connect.ConnectError(z.connect.ConnectError.TYPE.UPLOAD);
        }
      });
  }
};
