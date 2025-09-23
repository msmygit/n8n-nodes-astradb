import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { AstraDbV1 } from './v1/AstraDbV1.node.js';

export class AstraDb extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Astra DB',
			name: 'astraDb',
			icon: { light: 'file:astraDb.svg', dark: 'file:astraDb.dark.svg' },
			group: ['input'],
			description: 'Interact with DataStax Astra DB collections for document operations',
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new AstraDbV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}