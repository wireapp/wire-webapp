import axios, {type AxiosInstance} from 'axios';

export class OktaClient {
  protected axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.OKTA_API_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `SSWS ${process.env.OKTA_API_KEY}`,
      },
    });
  }

  async createApplication(label: string) {
    const finalizeUrl = new URL('/sso/finalize-login', process.env.BACKEND_URL).toString();

    const res = await this.axiosInstance
      .post('api/v1/apps', {
        body: {
          label,
          visibility: {
            autoSubmitToolbar: false,
          },
          signOnMode: 'SAML_2_0',
          credentials: {
            userNameTemplate: {
              template: '${fn:substringBefore(source.login, "@")}',
              type: 'BUILT_IN',
            },
          },
          settings: {
            signOn: {
              ssoAcsUrl: finalizeUrl,
              idpIssuer: 'https://www.okta.com/${org.externalKey}',
              audience: finalizeUrl,
              recipient: finalizeUrl,
              destination: finalizeUrl,
              subjectNameIdTemplate: '${user.email}',
              subjectNameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
              responseSigned: true,
              assertionSigned: true,
              signatureAlgorithm: 'RSA_SHA256',
              digestAlgorithm: 'SHA256',
              honorForceAuthn: true,
              authnContextClassRef: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
              requestCompressed: false,
            },
          },
        },
      })
      .catch(e => {
        throw new Error('Failed to create SSO Application in Okta', {cause: e});
      });

    const {id: applicationId} = res.data;
    if (!applicationId || typeof applicationId !== 'string')
      throw new Error("Response of okta app creation didn't match the expected shape");

    const groupId = await this.getGroupId('Everyone');
    await this.assignApplicationToGroup(applicationId, groupId);
    return applicationId;
  }

  private async getGroupId(groupName: string): Promise<string> {
    const res = await this.axiosInstance
      .get(`api/v1/groups`, {
        params: {
          limit: 1,
          search: `profile.name eq "${groupName}"`,
        },
      })
      .catch(() => {
        throw new Error('Failed to fetch existing groups from Okta');
      });

    if (!Array.isArray(res.data) || res.data.length < 1) throw new Error(`Couldn't find group with name ${groupName}`);

    const group: unknown = res.data[0];
    if (!group || typeof group !== 'object' || !('id' in group) || typeof group.id !== 'string')
      throw new Error("Shape of data returned by Okta list groups endpoint didn't contain the id as expected");

    return group.id;
  }

  private async assignApplicationToGroup(applicationId: string, groupId: string) {
    await this.axiosInstance.put(`api/v1/apps/${applicationId}/group/${groupId}`).catch(() => {
      throw new Error('Failed to assign application to group');
    });
  }

  async getApplicationMetadata(applicationId: string) {
    const res = await this.axiosInstance
      .get<string>(`api/v1/apps/${applicationId}/sso/saml/metadata`, {responseType: 'text'})
      .catch(() => {
        throw new Error('Failed to fetch application metadata');
      });
    return res.data; // ToDo: This should be xml as response
  }
}
