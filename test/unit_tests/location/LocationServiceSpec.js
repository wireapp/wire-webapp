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

/* eslint no-undef: "off" */

// grunt test_init && grunt test_run:location/LocationService

'use strict';

describe('z.location.LocationService', () => {
  describe('getLocation', () => {
    it('resolves a latitude & longitude via Google Maps API into a location name', () => {
      // prettier-ignore
      const locations = [{'address_components': [{'long_name': '2', 'short_name': '2', 'types': ['street_number']}, {'long_name': 'Alexanderstraße', 'short_name': 'Alexanderstraße', 'types': ['route']}, {'long_name': 'Mitte', 'short_name': 'Mitte', 'types': ['political', 'sublocality', 'sublocality_level_1']}, {'long_name': 'Berlin', 'short_name': 'Berlin', 'types': ['locality', 'political']}, {'long_name': 'Berlin', 'short_name': 'Berlin', 'types': ['administrative_area_level_1', 'political']}, {'long_name': 'Deutschland', 'short_name': 'DE', 'types': ['country', 'political']}, {'long_name': '10178', 'short_name': '10178', 'types': ['postal_code']}], 'formatted_address': 'Alexanderstraße 2, 10178 Berlin, Deutschland', 'geometry': {'location': {'lat': 52.523824, 'lng': 13.4145348}, 'location_type': 'ROOFTOP', 'viewport': {'northeast': {'lat': 52.52517298029149, 'lng': 13.4158837802915}, 'southwest': {'lat': 52.52247501970849, 'lng': 13.4131858197085}}}, 'place_id': 'ChIJ7xU9wx5OqEcRbjo-v63nALk', 'types': ['street_address']}, {'address_components': [{'long_name': 'Berlin (Alexanderplatz)', 'short_name': 'Berlin (Alexanderplatz)', 'types': ['bus_station', 'establishment', 'point_of_interest', 'transit_station']}, {'long_name': 'Mitte', 'short_name': 'Mitte', 'types': ['political', 'sublocality', 'sublocality_level_1']}, {'long_name': 'Berlin', 'short_name': 'Berlin', 'types': ['locality', 'political']}, {'long_name': 'Berlin', 'short_name': 'Berlin', 'types': ['administrative_area_level_1', 'political']}, {'long_name': 'Deutschland', 'short_name': 'DE', 'types': ['country', 'political']}, {'long_name': '10178', 'short_name': '10178', 'types': ['postal_code']}], 'formatted_address': 'Berlin (Alexanderplatz), 10178 Berlin, Deutschland', 'geometry': {'location': {'lat': 52.523198, 'lng': 13.414529}, 'location_type': 'APPROXIMATE', 'viewport': {'northeast': {'lat': 52.5245469802915, 'lng': 13.4158779802915}, 'southwest': {'lat': 52.5218490197085, 'lng': 13.4131800197085}}}, 'place_id': 'ChIJHTq-2R5OqEcRNJ0lG6qK3T4', 'types': ['bus_station', 'establishment', 'point_of_interest', 'transit_station']}, {'address_components': [{'long_name': 'Mitte', 'short_name': 'Mitte', 'types': ['political', 'sublocality', 'sublocality_level_2']}, {'long_name': 'Mitte', 'short_name': 'Mitte', 'types': ['political', 'sublocality', 'sublocality_level_1']}, {'long_name': 'Berlin', 'short_name': 'Berlin', 'types': ['locality', 'political']}, {'long_name': 'Berlin', 'short_name': 'Berlin', 'types': ['administrative_area_level_1', 'political']}, {'long_name': 'Deutschland', 'short_name': 'DE', 'types': ['country', 'political']}], 'formatted_address': 'Mitte, Berlin, Deutschland', 'geometry': {'bounds': {'northeast': {'lat': 52.5403962, 'lng': 13.4293586}, 'southwest': {'lat': 52.5040199, 'lng': 13.3658543}}, 'location': {'lat': 52.519444, 'lng': 13.406667}, 'location_type': 'APPROXIMATE', 'viewport': {'northeast': {'lat': 52.5403962, 'lng': 13.4293586}, 'southwest': {'lat': 52.5040199, 'lng': 13.3658543}}}, 'place_id': 'ChIJjw3Y6t9RqEcR8jUVWEcgISY', 'types': ['political', 'sublocality', 'sublocality_level_2']}, {'address_components': [{'long_name': 'Mitte', 'short_name': 'Mitte', 'types': ['political', 'sublocality', 'sublocality_level_1']}, {'long_name': 'Berlin', 'short_name': 'Berlin', 'types': ['locality', 'political']}, {'long_name': 'Berlin', 'short_name': 'Berlin', 'types': ['administrative_area_level_1', 'political']}, {'long_name': 'Deutschland', 'short_name': 'DE', 'types': ['country', 'political']}], 'formatted_address': 'Mitte, Berlin, Deutschland', 'geometry': {'bounds': {'northeast': {'lat': 52.5677268, 'lng': 13.4293586}, 'southwest': {'lat': 52.4987314, 'lng': 13.3015252}}, 'location': {'lat': 52.5306438, 'lng': 13.3830683}, 'location_type': 'APPROXIMATE', 'viewport': {'northeast': {'lat': 52.5677268, 'lng': 13.4293586}, 'southwest': {'lat': 52.4987314, 'lng': 13.3015252}}}, 'place_id': 'ChIJAUK8it1RqEcRwKtfW0YgIQU', 'types': ['political', 'sublocality', 'sublocality_level_1']}, {'address_components': [{'long_name': 'Berlin', 'short_name': 'Berlin', 'types': ['locality', 'political']}, {'long_name': 'Berlin', 'short_name': 'Berlin', 'types': ['administrative_area_level_1', 'political']}, {'long_name': 'Deutschland', 'short_name': 'DE', 'types': ['country', 'political']}], 'formatted_address': 'Berlin, Deutschland', 'geometry': {'bounds': {'northeast': {'lat': 52.6754542, 'lng': 13.7611176}, 'southwest': {'lat': 52.338234, 'lng': 13.088346}}, 'location': {'lat': 52.52000659999999, 'lng': 13.404954}, 'location_type': 'APPROXIMATE', 'viewport': {'northeast': {'lat': 52.6754542, 'lng': 13.7611175}, 'southwest': {'lat': 52.33962959999999, 'lng': 13.0911733}}}, 'place_id': 'ChIJAVkDPzdOqEcRcDteW0YgIQQ', 'types': ['locality', 'political']}, {'address_components': [{'long_name': '10178', 'short_name': '10178', 'types': ['postal_code']}, {'long_name': 'Berlin', 'short_name': 'Berlin', 'types': ['locality', 'political']}, {'long_name': 'Berlin', 'short_name': 'Berlin', 'types': ['administrative_area_level_1', 'political']}, {'long_name': 'Deutschland', 'short_name': 'DE', 'types': ['country', 'political']}], 'formatted_address': '10178 Berlin, Deutschland', 'geometry': {'bounds': {'northeast': {'lat': 52.528538, 'lng': 13.4296049}, 'southwest': {'lat': 52.5120099, 'lng': 13.3940579}}, 'location': {'lat': 52.5221879, 'lng': 13.4093313}, 'location_type': 'APPROXIMATE', 'viewport': {'northeast': {'lat': 52.528538, 'lng': 13.4296049}, 'southwest': {'lat': 52.5120099, 'lng': 13.3940579}}}, 'place_id': 'ChIJ85n72yFOqEcRIM89lUkgIRw', 'types': ['postal_code']}, {'address_components': [{'long_name': 'Berlin', 'short_name': 'Berlin', 'types': ['administrative_area_level_1', 'establishment', 'point_of_interest', 'political']}, {'long_name': 'Deutschland', 'short_name': 'DE', 'types': ['country', 'political']}], 'formatted_address': 'Berlin, Deutschland', 'geometry': {'bounds': {'northeast': {'lat': 52.6754542, 'lng': 13.7611176}, 'southwest': {'lat': 52.338234, 'lng': 13.088346}}, 'location': {'lat': 52.4938053, 'lng': 13.4552919}, 'location_type': 'APPROXIMATE', 'viewport': {'northeast': {'lat': 52.6754542, 'lng': 13.7611175}, 'southwest': {'lat': 52.33962959999999, 'lng': 13.0911733}}}, 'place_id': 'ChIJ8_KccStOqEcRhtFXjKWPuo0', 'types': ['administrative_area_level_1', 'establishment', 'point_of_interest', 'political']}, {'address_components': [{'long_name': 'Metropolregion Berlin/Brandenburg', 'short_name': 'Metropolregion Berlin/Brandenburg', 'types': ['political']}, {'long_name': 'Deutschland', 'short_name': 'DE', 'types': ['country', 'political']}], 'formatted_address': 'Metropolregion Berlin/Brandenburg, Deutschland', 'geometry': {'bounds': {'northeast': {'lat': 53.55898, 'lng': 14.7658261}, 'southwest': {'lat': 51.3590586, 'lng': 11.265727}}, 'location': {'lat': 52.268409, 'lng': 13.5287229}, 'location_type': 'APPROXIMATE', 'viewport': {'northeast': {'lat': 53.55898, 'lng': 14.765826}, 'southwest': {'lat': 51.3590586, 'lng': 11.265727}}}, 'place_id': 'ChIJZ4kamin3qEcRQ5VPQ7O8dWY', 'types': ['political']}, {'address_components': [{'long_name': 'Deutschland', 'short_name': 'DE', 'types': ['country', 'political']}], 'formatted_address': 'Deutschland', 'geometry': {'bounds': {'northeast': {'lat': 55.0815, 'lng': 15.0418962}, 'southwest': {'lat': 47.2701115, 'lng': 5.8663425}}, 'location': {'lat': 51.165691, 'lng': 10.451526}, 'location_type': 'APPROXIMATE', 'viewport': {'northeast': {'lat': 55.05812359999999, 'lng': 15.0418487}, 'southwest': {'lat': 47.2702482, 'lng': 5.8664874}}}, 'place_id': 'ChIJa76xwh5ymkcRW-WRjmtd6HU', 'types': ['country', 'political']}];

      const latitude = 52.5233;
      const longitude = 13.4138;

      const backendClientMock = {
        createUrl: () => {},
        sendRequest: () => Promise.resolve({results: locations, status: 'OK'}),
      };
      const locationService = new z.location.LocationService(backendClientMock);
      return locationService.getLocation(latitude, longitude).then(location => {
        expect(location.countryCode).toBe('DE');
        expect(location.place).toBe('Berlin');
      });
    });

    it('prevents potential Cross-Site-Scripting (XSS) attacks via Google Maps API', () => {
      // prettier-ignore
      const locations = [{'address_components': [{'long_name': '2', 'short_name': '2', 'types': ['street_number']}, {'long_name': 'Alexanderstraße', 'short_name': 'Alexanderstraße', 'types': ['route']}, {'long_name': 'Mitte', 'short_name': 'Mitte', 'types': ['political', 'sublocality', 'sublocality_level_1']}, {'long_name': 'Berlin', 'short_name': 'Berlin', 'types': ['locality', 'political']}, {'long_name': 'Berlin', 'short_name': 'Berlin', 'types': ['administrative_area_level_1', 'political']}, {'long_name': 'Deutschland', 'short_name': '<script>alert("malicious")</script>', 'types': ['country', 'political']}, {'long_name': '10178', 'short_name': '10178', 'types': ['postal_code']}], 'formatted_address': 'Alexanderstraße 2, 10178 Berlin, Deutschland', 'geometry': {'location': {'lat': 52.523824, 'lng': 13.4145348}, 'location_type': 'ROOFTOP', 'viewport': {'northeast': {'lat': 52.52517298029149, 'lng': 13.4158837802915}, 'southwest': {'lat': 52.52247501970849, 'lng': 13.4131858197085}}}, 'place_id': 'ChIJ7xU9wx5OqEcRbjo-v63nALk', 'types': ['street_address']}];
      const latitude = 52.5233;
      const longitude = 13.4138;

      const backendClientMock = {
        createUrl: () => {},
        sendRequest: () => Promise.resolve({results: locations, status: 'OK'}),
      };

      const locationService = new z.location.LocationService(backendClientMock);
      return locationService.getLocation(latitude, longitude).then(location => {
        expect(location.countryCode).toBe('&lt;script&gt;alert(&quot;malicious&quot;)&lt;/script&gt;');
        expect(location.place).toBe('Berlin');
      });
    });
  });

  describe('getMapsUrl', () => {
    it('should return the proper urls', () => {
      const locationService = new z.location.LocationService({});

      expect(locationService.getMapsUrl(52, 13)).toBe('https://google.com/maps/@52,13');
      expect(locationService.getMapsUrl(52, 13, null, 14)).toBe('https://google.com/maps/@52,13,14z');
      expect(locationService.getMapsUrl(52, 13, 'Berlin')).toBe('https://google.com/maps/place/Berlin/@52,13');
      expect(locationService.getMapsUrl(52, 13, 'Berlin', 14)).toBe('https://google.com/maps/place/Berlin/@52,13,14z');
    });
  });
});
