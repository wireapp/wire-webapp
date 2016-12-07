# grunt test_init && grunt test_run:links/LinkPreviewBlackList

describe 'is_blacklisted', ->

  it 'should return true if link is youtu.be', ->
    url = 'https://youtu.be/t4gjl-uwUHc'
    expect(z.links.LinkPreviewBlackList.is_blacklisted(url)).toBeTruthy()

  it 'should return true if link is youtube', ->
    url = 'https://www.youtube.com/watch?v=t4gjl-uwUHc'
    expect(z.links.LinkPreviewBlackList.is_blacklisted(url)).toBeTruthy()

  it 'should return true if link is spotify', ->
    url = 'spotify.com'
    expect(z.links.LinkPreviewBlackList.is_blacklisted(url)).toBeTruthy()

  it 'should return true if link is soundcloud', ->
    url = 'soundcloud.com'
    expect(z.links.LinkPreviewBlackList.is_blacklisted(url)).toBeTruthy()

  it 'should return true if link is vimeo', ->
    url = 'vimeo.com'
    expect(z.links.LinkPreviewBlackList.is_blacklisted(url)).toBeTruthy()

  it 'should return false if link is wire.com', ->
    url = 'wire.com'
    expect(z.links.LinkPreviewBlackList.is_blacklisted(url)).toBeFalsy()
