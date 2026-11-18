import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';
export class ParsewiseApi implements ICredentialType {
 name = 'parsewiseApi'; displayName = 'Parsewise API';
 icon = { light: 'file:../nodes/Parsewise/parsewise.svg', dark: 'file:../nodes/Parsewise/parsewise.dark.svg' } as const;
 documentationUrl = 'https://docs.parsewise.ai/api';
 properties: INodeProperties[] = [{ displayName: 'API Key', name: 'apiKey', type: 'string', typeOptions: { password: true }, default: '', required: true }];
 authenticate: IAuthenticateGeneric = { type: 'generic', properties: { headers: { 'X-API-Key': '={{$credentials.apiKey}}' } } };
 // https://docs.parsewise.ai/api/projects/projects_list/
 test: ICredentialTestRequest = { request: { baseURL: 'https://api.parsewise.ai/api/v1', url: '/projects/', method: 'GET', json: true } };
}
