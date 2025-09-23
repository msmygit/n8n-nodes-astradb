import type { IDataObject, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { DataAPIClient } from '@datastax/astra-db-ts';
import type { IAstraDbCredentials, IAstraOptions, IAstraResponse } from './types';

/**
 * Raw credential validation function (no node dependency)
 * This is used for credential testing where we don't have access to a node instance
 * Following cubic-dev-ai feedback to avoid 'as any' casting
 */
export function validateAstraCredentialsRaw(credentials: IDataObject): IAstraDbCredentials {
	if (!credentials.endpoint || typeof credentials.endpoint !== 'string') {
		throw new Error('Astra DB endpoint is required');
	}
	if (!credentials.token || typeof credentials.token !== 'string') {
		throw new Error('Astra DB token is required');
	}
	return {
		endpoint: credentials.endpoint.trim(),
		token: credentials.token.trim(),
	};
}

/**
 * Node-aware credential validation function
 * This wraps the raw validator and converts errors to NodeOperationError
 */
export function validateAstraCredentials(node: INode, credentials: IDataObject): IAstraDbCredentials {
	try {
		return validateAstraCredentialsRaw(credentials);
	} catch (err) {
		throw new NodeOperationError(node, (err as Error).message);
	}
}

/**
 * Connect to Astra DB client
 */
export async function connectAstraClient(credentials: IAstraDbCredentials): Promise<DataAPIClient> {
	try {
		const client = new DataAPIClient(credentials.token);
		return client;
	} catch (error) {
		throw new Error(`Failed to connect to Astra DB: ${(error as Error).message}`);
	}
}

/**
 * Validate keyspace and collection names
 */
export function validateKeyspaceCollectionName(node: INode, name: string, type: 'keyspace' | 'collection'): void {
	if (!name || typeof name !== 'string') {
		throw new NodeOperationError(node, `Astra DB ${type} name is required`);
	}
	
	const trimmedName = name.trim();
	if (!trimmedName) {
		throw new NodeOperationError(node, `Astra DB ${type} name cannot be empty`);
	}
	
	// Basic validation for keyspace/collection names
	if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmedName)) {
		throw new NodeOperationError(node, `Invalid ${type} name. Must start with a letter and contain only letters, numbers, and underscores`);
	}
}

/**
 * Validate query objects
 */
export function validateQuery(node: INode, query: any, fieldName: string): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];
	
	if (query === null || query === undefined) {
		errors.push(`${fieldName} cannot be null or undefined`);
		return { isValid: false, errors };
	}
	
	if (typeof query !== 'object') {
		errors.push(`${fieldName} must be an object`);
		return { isValid: false, errors };
	}
	
	if (Array.isArray(query)) {
		errors.push(`${fieldName} cannot be an array`);
		return { isValid: false, errors };
	}
	
	return { isValid: true, errors };
}

/**
 * Parse Astra options from node parameters
 */
export function parseAstraOptions(node: INode, options: IDataObject): IAstraOptions {
	const result: IAstraOptions = {};
	
	if (options.limit !== undefined) {
		const limit = Number(options.limit);
		if (isNaN(limit) || limit < 0) {
			throw new NodeOperationError(node, 'Limit must be a non-negative number');
		}
		result.limit = limit;
	}
	
	if (options.skip !== undefined) {
		const skip = Number(options.skip);
		if (isNaN(skip) || skip < 0) {
			throw new NodeOperationError(node, 'Skip must be a non-negative number');
		}
		result.skip = skip;
	}
	
	if (options.sort) {
		try {
			result.sort = typeof options.sort === 'string' ? JSON.parse(options.sort) : options.sort;
		} catch {
			throw new NodeOperationError(node, 'Invalid sort format. Must be valid JSON');
		}
	}
	
	if (options.projection) {
		try {
			result.projection = typeof options.projection === 'string' ? JSON.parse(options.projection) : options.projection;
		} catch {
			throw new NodeOperationError(node, 'Invalid projection format. Must be valid JSON');
		}
	}
	
	if (options.upsert !== undefined) {
		result.upsert = Boolean(options.upsert);
	}
	
	if (options.returnDocument) {
		result.returnDocument = options.returnDocument as 'before' | 'after';
	}
	
	return result;
}

/**
 * Insert one document
 */
export async function insertOneDocument(
	node: INode,
	collection: any,
	document: IDataObject
): Promise<IAstraResponse> {
	try {
		const result = await collection.insertOne(document);
		return formatAstraResponse(result, 'insertOne');
	} catch (error) {
		throw new NodeOperationError(node, `Failed to insert document: ${(error as Error).message}`);
	}
}

/**
 * Insert many documents
 */
export async function insertManyDocuments(
	node: INode,
	collection: any,
	documents: IDataObject[],
	options: IAstraOptions = {}
): Promise<IAstraResponse> {
	try {
		const result = await collection.insertMany(documents, options);
		return formatAstraResponse(result, 'insertMany');
	} catch (error) {
		throw new NodeOperationError(node, `Failed to insert documents: ${(error as Error).message}`);
	}
}

/**
 * Update documents
 */
export async function updateDocuments(
	node: INode,
	collection: any,
	filter: IDataObject,
	update: IDataObject,
	options: IAstraOptions = {}
): Promise<IAstraResponse> {
	try {
		const result = await collection.updateMany(filter, update, options);
		return formatAstraResponse(result, 'updateMany');
	} catch (error) {
		throw new NodeOperationError(node, `Failed to update documents: ${(error as Error).message}`);
	}
}

/**
 * Delete documents
 */
export async function deleteDocuments(
	node: INode,
	collection: any,
	filter: IDataObject
): Promise<IAstraResponse> {
	try {
		const result = await collection.deleteMany(filter);
		return formatAstraResponse(result, 'delete');
	} catch (error) {
		throw new NodeOperationError(node, `Failed to delete documents: ${(error as Error).message}`);
	}
}

/**
 * Find documents
 */
export async function findDocuments(
	node: INode,
	collection: any,
	filter: IDataObject,
	options: IAstraOptions = {}
): Promise<IAstraResponse> {
	try {
		const result = await collection.find(filter, options);
		return formatAstraResponse(result, 'findMany');
	} catch (error) {
		throw new NodeOperationError(node, `Failed to find documents: ${(error as Error).message}`);
	}
}

/**
 * Find one document
 */
export async function findOneDocument(
	node: INode,
	collection: any,
	filter: IDataObject,
	options: IAstraOptions = {}
): Promise<IAstraResponse> {
	try {
		const result = await collection.findOne(filter, options);
		return formatAstraResponse(result, 'findOne');
	} catch (error) {
		throw new NodeOperationError(node, `Failed to find document: ${(error as Error).message}`);
	}
}

/**
 * Find and update document
 */
export async function findAndUpdateDocument(
	node: INode,
	collection: any,
	filter: IDataObject,
	update: IDataObject,
	options: IAstraOptions = {}
): Promise<IAstraResponse> {
	try {
		const result = await collection.findOneAndUpdate(filter, update, options);
		return formatAstraResponse(result, 'findAndUpdate');
	} catch (error) {
		throw new NodeOperationError(node, `Failed to find and update document: ${(error as Error).message}`);
	}
}

/**
 * Find and replace document
 */
export async function findAndReplaceDocument(
	node: INode,
	collection: any,
	filter: IDataObject,
	replacement: IDataObject,
	options: IAstraOptions = {}
): Promise<IAstraResponse> {
	try {
		const result = await collection.findOneAndReplace(filter, replacement, options);
		return formatAstraResponse(result, 'findAndReplace');
	} catch (error) {
		throw new NodeOperationError(node, `Failed to find and replace document: ${(error as Error).message}`);
	}
}

/**
 * Find and delete document
 */
export async function findAndDeleteDocument(
	node: INode,
	collection: any,
	filter: IDataObject,
	options: IAstraOptions = {}
): Promise<IAstraResponse> {
	try {
		const result = await collection.findOneAndDelete(filter, options);
		return formatAstraResponse(result, 'findAndDelete');
	} catch (error) {
		throw new NodeOperationError(node, `Failed to find and delete document: ${(error as Error).message}`);
	}
}

/**
 * Get estimated document count
 */
export async function estimatedDocumentCount(
	node: INode,
	collection: any,
	options: IAstraOptions = {}
): Promise<IAstraResponse> {
	try {
		const result = await collection.estimatedDocumentCount(options);
		return formatAstraResponse(result, 'estimatedDocumentCount');
	} catch (error) {
		throw new NodeOperationError(node, `Failed to get document count: ${(error as Error).message}`);
	}
}

/**
 * Format Astra response
 */
export function formatAstraResponse(result: any, operation: string): IAstraResponse {
	const response: IAstraResponse = {
		operation,
		success: true,
		data: result,
	};

	// Add operation-specific fields
	switch (operation) {
		case 'insertOne':
			response.insertedId = result.insertedId;
			response.acknowledged = result.acknowledged;
			break;
		case 'insertMany':
			response.insertedIds = result.insertedIds;
			response.insertedCount = result.insertedCount;
			response.acknowledged = result.acknowledged;
			break;
		case 'updateMany':
			response.matchedCount = result.matchedCount;
			response.modifiedCount = result.modifiedCount;
			response.acknowledged = result.acknowledged;
			break;
		case 'delete':
			response.deletedCount = result.deletedCount;
			response.acknowledged = result.acknowledged;
			break;
		case 'findMany':
			response.data = result;
			break;
		case 'findOne':
			response.document = result;
			break;
		case 'findAndUpdate':
		case 'findAndReplace':
		case 'findAndDelete':
			response.document = result;
			break;
		case 'estimatedDocumentCount':
			response.count = result;
			break;
	}

	return response;
}


/**
 * Sanitize input data to ensure it's safe for n8n
 */
export function sanitizeInput(data: any): IDataObject {
	if (data === null || data === undefined) {
		return {};
	}
	
	if (typeof data === 'object' && !Array.isArray(data)) {
		return data as IDataObject;
	}
	
	return { data };
}