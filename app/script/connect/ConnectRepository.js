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
window.z.connect = z.connect = {};

z.connect.ConnectRepository = class ConnectRepository {
  constructor(connect_service, connect_google_service, properties_repository) {
    this.connect_service = connect_service;
    this.connect_google_service = connect_google_service;
    this.properties_repository = properties_repository;
    this.logger = new z.util.Logger('z.connect.ConnectRepository', z.config.LOGGER.OPTIONS);
  }

  /*
  Retrieve a user's Google Contacts.
  @return {Promise} - Resolves with the user's Google contacts that match on Wire
  */
  get_google_contacts() {
    return new Promise((resolve, reject) => {
      return this.connect_google_service.get_contacts()
      .catch((error) => {
        this.logger.info('Google Contacts SDK error', error);
        throw new z.connect.ConnectError(z.connect.ConnectError.prototype.TYPE.GOOGLE_DOWNLOAD);
      }).then((response) => {
        amplify.publish(z.event.WebApp.SEARCH.SHOW);
        return this._parse_google_contacts(response);
      }).then((phone_book) => {
        if (phone_book.cards.length === 0) {
          this.logger.warn('No contacts found for upload');
          throw new z.connect.ConnectError(z.connect.ConnectError.prototype.TYPE.NO_CONTACTS);
        } else {
          this.logger.info(`Uploading hashes of '${phone_book.cards.length}' contacts for matching`, phone_book);
          return this.connect_service.post_onboarding(phone_book);
        }
      }).then((response) => {
        this.logger.info(`Gmail contacts upload successful: ${response.results.length} matches, ${response['auto-connects'].length} auto connects`, response);
        this.properties_repository.save_preference_contact_import_google(Date.now());
        return resolve(response);
      }).catch((error) => {
        if (error instanceof z.connect.ConnectError) {
          switch (error.type) {
            case z.connect.ConnectError.prototype.TYPE.GOOGLE_DOWNLOAD:
              return reject(error);
            case z.connect.ConnectError.prototype.TYPE.NO_CONTACTS:
              return resolve([]);
          }
        } else {
          if (error.code === z.service.BackendClientError.prototype.STATUS_CODE.TOO_MANY_REQUESTS) {
            let error_message = 'Backend refused Gmail contacts upload: Endpoint used too frequent';
            this.logger.error(error_message);
          } else {
            this.logger.error('Gmail contacts upload failed', error);
          }
          return reject(new z.connect.ConnectError(z.connect.ConnectError.prototype.TYPE.UPLOAD));
        }
      });
    });
  }

  /*
  Retrieve a user's macOS address book contacts.
  @return {Promise} - Resolves with the user's address book contacts that match on Wire
  */
  get_macos_contacts() {
    // TODO: Delete this block after uptake of wrapper builds including new address book implementation
    if (window.zAddressBook) {
      return new Promise((resolve, reject) => {
        let phone_book = this._parse_old_macos_contacts();

        if (phone_book.cards.length === 0) {
          this.logger.warn('No contacts found for upload');
          return reject(new z.connect.ConnectError(z.connect.ConnectError.prototype.TYPE.NO_CONTACTS));
        }

        amplify.publish(z.event.WebApp.SEARCH.SHOW);
        this.logger.info(`Uploading hashes of '${phone_book.cards.length}' contacts for matching`, phone_book);
        return this.connect_service.post_onboarding(phone_book)
        .then((response) => {
          this.logger.info(`macOS contacts upload successful: ${response.results.length} matches, ${response['auto-connects'].length} auto connects`, response);
          this.properties_repository.save_preference_contact_import_macos(Date.now());
          return resolve(response);
        }).catch((error) => {
          if (error.code === z.service.BackendClientError.prototype.STATUS_CODE.TOO_MANY_REQUESTS) {
            let error_message = 'Backend refused macOS contacts upload: Endpoint used too frequent';
            this.logger.error(error_message);
          } else {
            this.logger.error('macOS contacts upload failed', error);
          }
          return reject(new z.connect.ConnectError(z.connect.ConnectError.prototype.TYPE.UPLOAD));
        });
      });
    }

    return this._parse_macos_contacts()
    .then((phone_book) => {
      if (phone_book.cards.length === 0) {
        this.logger.warn('No contacts found for upload');
        throw new z.connect.ConnectError(z.connect.ConnectError.prototype.TYPE.NO_CONTACTS);
      }
      amplify.publish(z.event.WebApp.SEARCH.SHOW);
      this.logger.info(`Uploading hashes of '${phone_book.cards.length}' contacts for matching`, phone_book);
      return this.connect_service.post_onboarding(phone_book);
    }).then((response) => {
      this.logger.info(`macOS contacts upload successful: ${response.results.length} matches, ${response['auto-connects'].length} auto connects`, response);
      this.properties_repository.save_preference_contact_import_macos(Date.now());
      return response;
    }).catch((error) => {
      if (error.code === z.service.BackendClientError.prototype.STATUS_CODE.TOO_MANY_REQUESTS) {
        let error_message = 'Backend refused macOS contacts upload: Endpoint used too frequent';
        return this.logger.error(error_message);
      }
      this.logger.error('macOS contacts upload failed', error);
      throw new z.connect.ConnectError(z.connect.ConnectError.prototype.TYPE.UPLOAD);
    });
  }

  /*
  Encode phone book

  @private
  @param {z.connect.PhoneBook} phone_book Object containing un-encoded phone book data
  @return {z.connect.PhoneBook} - Object containing encoded phone book data
  */
  _encode_phone_book(phone_book) {
    phone_book.self.forEach((contact, contact_index) => {
      phone_book.self[contact_index] = z.util.encode_sha256_base64(contact);
    });

    phone_book.cards.forEach((card, card_index) => {
      card.contact.forEach((contact, contact_index) => {
        card.contact[contact_index] = z.util.encode_sha256_base64(contact);
      });
      phone_book.cards[card_index] = card;
    });
    return phone_book;
  }

  /*
  Parse a user's macOS address book Contacts.
  @private
  @return {z.connect.PhoneBook} - Encoded phone book data
  */
  _parse_macos_contacts() {
    return new Promise((resolve) => {
      if (!window.wAddressBook) {
        return resolve(undefined);
      }
      let address_book = window.wAddressBook;
      let phone_book = new z.connect.PhoneBook(this.properties_repository.self());

      let me = address_book.getMe();
      me.emails.forEach((email) => {
        phone_book.self.push(email);
      });
      me.emails.forEach((number) => {
        phone_book.self.push(number);
      });

      return address_book.getContacts((percentage) => {
        return this.logger.info('Importing Contacts', percentage);
      }, (contacts) => {
        contacts.forEach((contact) => {
          let card = {
            contact: [],
            card_id: CryptoJS.MD5(`${contact.firstName}${contact.lastName}`).toString(),
          };
          contact.emails.forEach((email) => {
            card.contact.push(email.toLowerCase().trim());
          });
          contact.numbers.forEach((number) => {
            card.contact.push(z.util.phone_number_to_e164(number, navigator.language));
          });

          if (card.contact.length > 0) {
            phone_book.cards.push(card);
          }
        });
        return resolve(this._encode_phone_book(phone_book));
      });
    });
  }


  // TODO: Delete this block after uptake of wrapper builds including new address book implementation
  _parse_old_macos_contacts() {
    if (!window.zAddressBook) {
      return;
    }

    let address_book = window.zAddressBook();
    let phone_book = new z.connect.PhoneBook(this.properties_repository.self());

    let me = address_book.getMe();
    me.emails.forEach((email) => {
      phone_book.self.push(email);
    });
    me.emails.forEach((number) => {
      phone_book.self.push(number);
    });

    let x = 0;
    while (x < address_book.contactCount()) {
      let contact = address_book.getContact(x);
      let card = {
        contact: [],
        card_id: CryptoJS.MD5(`${contact.firstName}${contact.lastName}`).toString(),
      };
      contact.emails.forEach((email) => {
        card.contact.push(email.toLowerCase().trim());
      });
      contact.numbers.forEach((number) => {
        card.contact.push(z.util.phone_number_to_e164(number, navigator.language));
      });

      if (card.contact.length > 0) {
        phone_book.cards.push(card);
      }
      x++;
    }

    return this._encode_phone_book(phone_book);
  }


  /*
  Parse a user's Google Contacts.
  @private
  @param {JSON} response Response from Google API
  @return {z.connect.PhoneBook} - Encoded phone book data
  */
  _parse_google_contacts(response) {
    let phone_book = new z.connect.PhoneBook(this.properties_repository.self());

    // Add self info from Google
    if (response.feed.author !== null) {
      let self = response.feed.author;
      let google_email = self[0].email.$t.toLowerCase().trim();
      if (!this.properties_repository.self().email() === google_email) {
        phone_book.self.push(google_email);
      }
    }

    // Add Google contacts
    if (response.feed.entry) {
      let users = response.feed.entry;
      users.forEach((user) => {
        if ((user.gd$email) || (user.gd$phoneNumber)) {
          let card = {
            contact: [],
            card_id: user.gd$etag,
          };

          if (user.gd$email) {
            user.gd$email.forEach((email) => {
              card.contact.push(email.address.toLowerCase().trim());
            });
          }

          if (user.gd$phoneNumber) {
            user.gd$phoneNumber.forEach((number) => {
              if (number.uri) {
                card.contact.push(number.uri);
              } else {
                card.contact.push(number.$t);
              }
            });
          }

          if (card.contact.length > 0) {
            phone_book.cards.push(card);
          }
        }
      });
    }
    return this._encode_phone_book(phone_book);
  }
};
