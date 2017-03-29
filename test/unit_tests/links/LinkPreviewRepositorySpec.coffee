#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

describe 'z.links.LinkPreviewRepository', ->

  link_preview_repository = null

  beforeEach ->
    link_preview_repository = new z.links.LinkPreviewRepository()

  afterEach ->
    window.openGraph = undefined

  describe 'get_link_preview', ->

    beforeEach ->
      spyOn(link_preview_repository, '_fetch_open_graph_data').and.returnValue Promise.resolve()

    it 'should reject if open graph lib is not available', (done) ->
      link_preview_repository.get_link_preview()
      .then done.fail
      .catch (error) ->
        expect(error.type).toBe z.links.LinkPreviewError.TYPE.NOT_SUPPORTED
        done()

    it 'should fetch open graph data if openGraph lib is available', (done) ->
      window.openGraph = {}

      link_preview_repository.get_link_preview()
      .then ->
        done.fail
      .catch (error) ->
        expect(link_preview_repository._fetch_open_graph_data).toHaveBeenCalled()
        expect(error.type).toBe z.links.LinkPreviewError.TYPE.NO_DATA_AVAILABLE
        done()

    it 'should reject if link is blacklisted', (done) ->
      window.openGraph = {}

      link_preview_repository.get_link_preview 'youtube.com'
      .then ->
        done.fail
      .catch (error) ->
        console.log error
        expect(error.type).toBe z.links.LinkPreviewError.TYPE.BLACKLISTED
        done()
