import type {
	IExecuteFunctions,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	connectAstraClient,
	validateAstraCredentialsRaw,
	validateKeyspaceCollectionName,
	validateQuery,
	insertOneDocument,
	insertManyDocuments,
	updateDocuments,
	deleteDocuments,
	findDocuments,
	findOneDocument,
	findAndUpdateDocument,
	findAndReplaceDocument,
	findAndDeleteDocument,
	estimatedDocumentCount,
	formatAstraResponse,
	parseAstraOptions,
	sanitizeInput,
} from './GenericFunctions';
import { generatePairedItemData } from './utilities';
import { nodeProperties } from './AstraDbProperties';

export class AstraDbV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			defaults: {
				name: 'Astra DB',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'astraDbApi',
					required: true,
					testedBy: 'astraDbCredentialTest',
				},
			],
			properties: nodeProperties,
		};
	}

	methods = {
		credentialTest: {
			async astraDbCredentialTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as IDataObject;

				try {
					// Use the raw validator for credential testing (no mock needed)
					// Following the cubic-dev-ai feedback pattern
					const validatedCredentials = validateAstraCredentialsRaw(credentials);
					const client = await connectAstraClient(validatedCredentials);

					// Test connection by creating a db object
					client.db(validatedCredentials.endpoint);

					return {
						status: 'OK',
						message: 'Connection successful!',
					};
				} catch (error) {
					return {
						status: 'Error',
						message: (error as Error).message,
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('astraDbApi');
		const validatedCredentials = validateAstraCredentialsRaw(credentials);
		const client = await connectAstraClient(validatedCredentials);
		const returnData: INodeExecutionData[] = [];

		try {
			const items = this.getInputData();
			const operation = this.getNodeParameter('operation', 0) as string;
			const collection = this.getNodeParameter('collection', 0) as string;
			const keyspace = this.getNodeParameter('keyspace', 0) as string;

			// Validate keyspace name
			validateKeyspaceCollectionName(this.getNode(), keyspace, 'keyspace');
			// Validate collection name
			validateKeyspaceCollectionName(this.getNode(), collection, 'collection');

			// Create db object with keyspace
			const db = client.db(validatedCredentials.endpoint, {
				keyspace: keyspace,
			});

			// Create collection object
			const collectionObj = db.collection(collection);

			const itemsLength = items.length;
			const fallbackPairedItems = generatePairedItemData(items.length, 0);

			// Handle different operations
			for (let i = 0; i < itemsLength; i++) {
				try {
					let result: any;

					switch (operation) {
						case 'insertOne':
							result = await AstraDbV1.handleInsertOne(this, collectionObj, i);
							break;
						case 'insertMany':
							result = await AstraDbV1.handleInsertMany(this, collectionObj, i);
							break;
						case 'findMany':
							result = await AstraDbV1.handleFindMany(this, collectionObj, i);
							break;
						case 'findOne':
							result = await AstraDbV1.handleFindOne(this, collectionObj, i);
							break;
						case 'updateMany':
							result = await AstraDbV1.handleUpdateMany(this, collectionObj, i);
							break;
						case 'delete':
							result = await AstraDbV1.handleDelete(this, collectionObj, i);
							break;
						case 'findAndUpdate':
							result = await AstraDbV1.handleFindAndUpdate(this, collectionObj, i);
							break;
						case 'findAndReplace':
							result = await AstraDbV1.handleFindAndReplace(this, collectionObj, i);
							break;
						case 'findAndDelete':
							result = await AstraDbV1.handleFindAndDelete(this, collectionObj, i);
							break;
						case 'estimatedDocumentCount':
							result = await AstraDbV1.handleEstimatedDocumentCount(this, collectionObj, i);
							break;
						default:
							throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
					}

					// Handle result based on operation type with proper item linking
					if (operation === 'findMany') {
						// Return each document as a separate item, all linked to the same input item
						const documents = result.documents || result;
						if (Array.isArray(documents)) {
							for (const document of documents) {
								returnData.push({
									json: sanitizeInput(document),
									pairedItem: fallbackPairedItems[i], // All documents linked to same input item
								});
							}
						} else {
							returnData.push({
								json: sanitizeInput(documents),
								pairedItem: fallbackPairedItems[i],
							});
						}
					} else {
						// Single result operations - one output item per input item
						returnData.push({
							json: formatAstraResponse(result, operation),
							pairedItem: fallbackPairedItems[i],
						});
					}
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: { error: (error as JsonObject).message },
							pairedItem: fallbackPairedItems[i],
						});
						continue;
					}
					throw error;
				}
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: (error as JsonObject).message },
					pairedItem: [{ item: 0 }],
				});
			} else {
				throw error;
			}
		}

		return [returnData];
	}

	private static async handleInsertOne(executeFunctions: IExecuteFunctions, collectionObj: any, itemIndex: number): Promise<any> {
		const document = JSON.parse(executeFunctions.getNodeParameter('document', itemIndex) as string);
		return await insertOneDocument(executeFunctions.getNode(), collectionObj, document);
	}

	private static async handleInsertMany(executeFunctions: IExecuteFunctions, collectionObj: any, itemIndex: number): Promise<any> {
		const documents = JSON.parse(executeFunctions.getNodeParameter('documents', itemIndex) as string);
		const options = parseAstraOptions(
			executeFunctions.getNode(),
			executeFunctions.getNodeParameter('options', itemIndex, {})
		);
		return await insertManyDocuments(executeFunctions.getNode(), collectionObj, documents, options);
	}

	private static async handleFindMany(executeFunctions: IExecuteFunctions, collectionObj: any, itemIndex: number): Promise<any> {
		const filter = JSON.parse(executeFunctions.getNodeParameter('filter', itemIndex) as string);
		const options = parseAstraOptions(
			executeFunctions.getNode(),
			executeFunctions.getNodeParameter('options', itemIndex, {})
		);

		const validation = validateQuery(executeFunctions.getNode(), filter, 'filter');
		if (!validation.isValid) {
			throw new NodeOperationError(executeFunctions.getNode(), `Invalid filter: ${validation.errors.join(', ')}`);
		}

		return await findDocuments(executeFunctions.getNode(), collectionObj, filter, options);
	}

	private static async handleFindOne(executeFunctions: IExecuteFunctions, collectionObj: any, itemIndex: number): Promise<any> {
		const filter = JSON.parse(executeFunctions.getNodeParameter('filter', itemIndex) as string);
		const options = parseAstraOptions(
			executeFunctions.getNode(),
			executeFunctions.getNodeParameter('options', itemIndex, {})
		);

		const validation = validateQuery(executeFunctions.getNode(), filter, 'filter');
		if (!validation.isValid) {
			throw new NodeOperationError(executeFunctions.getNode(), `Invalid filter: ${validation.errors.join(', ')}`);
		}

		const result = await findOneDocument(executeFunctions.getNode(), collectionObj, filter, options);
		return result || {};
	}

	private static async handleUpdateMany(executeFunctions: IExecuteFunctions, collectionObj: any, itemIndex: number): Promise<any> {
		const filter = JSON.parse(executeFunctions.getNodeParameter('filter', itemIndex) as string);
		const update = JSON.parse(executeFunctions.getNodeParameter('update', itemIndex) as string);
		const options = parseAstraOptions(
			executeFunctions.getNode(),
			executeFunctions.getNodeParameter('options', itemIndex, {})
		);

		const filterValidation = validateQuery(executeFunctions.getNode(), filter, 'filter');
		if (!filterValidation.isValid) {
			throw new NodeOperationError(executeFunctions.getNode(), `Invalid filter: ${filterValidation.errors.join(', ')}`);
		}

		const updateValidation = validateQuery(executeFunctions.getNode(), update, 'update');
		if (!updateValidation.isValid) {
			throw new NodeOperationError(executeFunctions.getNode(), `Invalid update: ${updateValidation.errors.join(', ')}`);
		}

		return await updateDocuments(executeFunctions.getNode(), collectionObj, filter, update, options);
	}

	private static async handleDelete(executeFunctions: IExecuteFunctions, collectionObj: any, itemIndex: number): Promise<any> {
		const filter = JSON.parse(executeFunctions.getNodeParameter('filter', itemIndex) as string);

		const validation = validateQuery(executeFunctions.getNode(), filter, 'filter');
		if (!validation.isValid) {
			throw new NodeOperationError(executeFunctions.getNode(), `Invalid filter: ${validation.errors.join(', ')}`);
		}

		return await deleteDocuments(executeFunctions.getNode(), collectionObj, filter);
	}

	private static async handleFindAndUpdate(executeFunctions: IExecuteFunctions, collectionObj: any, itemIndex: number): Promise<any> {
		const filter = JSON.parse(executeFunctions.getNodeParameter('filter', itemIndex) as string);
		const update = JSON.parse(executeFunctions.getNodeParameter('update', itemIndex) as string);
		const options = parseAstraOptions(
			executeFunctions.getNode(),
			executeFunctions.getNodeParameter('options', itemIndex, {})
		);

		const filterValidation = validateQuery(executeFunctions.getNode(), filter, 'filter');
		if (!filterValidation.isValid) {
			throw new NodeOperationError(executeFunctions.getNode(), `Invalid filter: ${filterValidation.errors.join(', ')}`);
		}

		const updateValidation = validateQuery(executeFunctions.getNode(), update, 'update');
		if (!updateValidation.isValid) {
			throw new NodeOperationError(executeFunctions.getNode(), `Invalid update: ${updateValidation.errors.join(', ')}`);
		}

		return await findAndUpdateDocument(executeFunctions.getNode(), collectionObj, filter, update, options);
	}

	private static async handleFindAndReplace(executeFunctions: IExecuteFunctions, collectionObj: any, itemIndex: number): Promise<any> {
		const filter = JSON.parse(executeFunctions.getNodeParameter('filter', itemIndex) as string);
		const replacement = JSON.parse(executeFunctions.getNodeParameter('replacement', itemIndex) as string);
		const options = parseAstraOptions(
			executeFunctions.getNode(),
			executeFunctions.getNodeParameter('options', itemIndex, {})
		);

		const filterValidation = validateQuery(executeFunctions.getNode(), filter, 'filter');
		if (!filterValidation.isValid) {
			throw new NodeOperationError(executeFunctions.getNode(), `Invalid filter: ${filterValidation.errors.join(', ')}`);
		}

		const replacementValidation = validateQuery(executeFunctions.getNode(), replacement, 'replacement');
		if (!replacementValidation.isValid) {
			throw new NodeOperationError(executeFunctions.getNode(), `Invalid replacement: ${replacementValidation.errors.join(', ')}`);
		}

		return await findAndReplaceDocument(executeFunctions.getNode(), collectionObj, filter, replacement, options);
	}

	private static async handleFindAndDelete(executeFunctions: IExecuteFunctions, collectionObj: any, itemIndex: number): Promise<any> {
		const filter = JSON.parse(executeFunctions.getNodeParameter('filter', itemIndex) as string);
		const options = parseAstraOptions(
			executeFunctions.getNode(),
			executeFunctions.getNodeParameter('options', itemIndex, {})
		);

		const validation = validateQuery(executeFunctions.getNode(), filter, 'filter');
		if (!validation.isValid) {
			throw new NodeOperationError(executeFunctions.getNode(), `Invalid filter: ${validation.errors.join(', ')}`);
		}

		return await findAndDeleteDocument(executeFunctions.getNode(), collectionObj, filter, options);
	}

	private static async handleEstimatedDocumentCount(executeFunctions: IExecuteFunctions, collectionObj: any, itemIndex: number): Promise<any> {
		const options = parseAstraOptions(
			executeFunctions.getNode(),
			executeFunctions.getNodeParameter('options', itemIndex, {})
		);
		return await estimatedDocumentCount(executeFunctions.getNode(), collectionObj, options);
	}
}