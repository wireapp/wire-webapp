import {IntegrationMapper} from "Repositories/integration/IntegrationMapper";
import {User} from "Repositories/entity/User";
import {AssetRemoteData} from "Repositories/assets/assetRemoteData";
import {UserType} from "@wireapp/api-client/lib/user";

describe('IntegrationMapper', () => {
  it('Should return an empty mapper', () => {
    const user = new User();
    const previewAsset = new AssetRemoteData({assetKey: 'previewKey', assetDomain: 'previewDomain'});
    const mediumAsset = new AssetRemoteData({assetKey: 'mediumKey', assetDomain: 'mediumDomain'});
    user.id = "testid";
    user.description = "testdescription";
    user.category = "testcategory";
    user.previewPictureResource(previewAsset);
    user.mediumPictureResource(mediumAsset);
    user.type = UserType.APP;

    const result = IntegrationMapper.mapServiceFromUser(user);

    expect(result.id).toEqual("testid");
    expect(result.description).toEqual("testdescription");
    expect(result.category).toEqual("testcategory");
    expect(result.previewPictureResource()).toEqual(previewAsset);
    expect(result.mediumPictureResource()).toEqual(mediumAsset);
  })
})
