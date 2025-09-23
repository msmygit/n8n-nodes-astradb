import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
//import { LoggerProxy as Logger } from 'n8n-workflow';

export class AstraDbApi implements ICredentialType {
	name = 'astraDbApi';
	displayName = 'Astra DB API';
	documentationUrl = 'https://docs.datastax.com/en/astra-db-serverless/index.html';
	properties: INodeProperties[] = [
		{
			displayName: 'Endpoint',
			name: 'endpoint',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Astra DB endpoint URL. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/administration/manage-application-tokens.html" target="_blank" rel="noopener noreferrer">documentation</a>',
			placeholder: 'https://your-database-id-your-region.apps.astra.datastax.com',
		},
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Astra DB application token. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/administration/manage-application-tokens.html" target="_blank" rel="noopener noreferrer">documentation</a>',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			...requestOptions.headers,
			'Authorization': `Bearer ${credentials.token as string}`,
		};
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.astra.datastax.com',
			url: '/v2/databases',
			method: 'GET',
			headers: {
				'Authorization': '=Bearer {{ $credentials.token }}',
				'Content-Type': 'application/json',
			},
		},
	};
}
