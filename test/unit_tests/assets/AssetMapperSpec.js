import * as AssetMapper from 'src/script/assets/AssetMapper';

describe('mapProfileAssets', () => {
  it('creates asset entities out of raw asset data', () => {
    const userId = '';
    const previewPictureId = '3-1-e705c3f5-7b4b-4136-a09b-01614cb355a1';
    const completePictureId = '3-1-d22e106a-3632-4280-8367-c14943e2eca2';
    const assets = [
      {
        key: previewPictureId,
        size: 'preview',
        type: 'image',
      },
      {
        key: completePictureId,
        size: 'complete',
        type: 'image',
      },
    ];

    const mappedAssets = AssetMapper.mapProfileAssets(userId, assets);

    expect(mappedAssets.medium.identifier).toBe(completePictureId);
    expect(mappedAssets.preview.identifier).toBe(previewPictureId);
  });
});
