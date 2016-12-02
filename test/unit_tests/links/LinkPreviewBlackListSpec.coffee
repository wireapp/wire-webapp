# grunt test_init && grunt test_run:links/LinkPreviewHelpers

describe 'is_blacklisted', ->

  it 'should return true if link is youtube', ->
    url = 'youtube.com'
    expect(z.links.LinkPreviewBlackList.is_blacklisted(url)).toBeTruthy()

  it 'should return true if link is spotify', ->
    url = 'spotify.com'
    expect(z.links.LinkPreviewBlackList.is_blacklisted(url)).toBeTruthy()

  it 'should return true if link is vimeo', ->
    url = 'vimeo.com'
    expect(z.links.LinkPreviewBlackList.is_blacklisted(url)).toBeTruthy()

  it 'should return false if link is spotify', ->
    url = 'wire.com'
    expect(z.links.LinkPreviewBlackList.is_blacklisted(url)).toBeFalsy()
