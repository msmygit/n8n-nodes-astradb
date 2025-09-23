import type { IDataObject } from 'n8n-workflow';

export interface IAstraDbCredentials {
	endpoint: string;
	token: string;
}

export interface IAstraOptions {
	limit?: number;
	skip?: number;
	sort?: Record<string, 1 | -1>;
	projection?: Record<string, 1 | 0>;
	upsert?: boolean;
	returnDocument?: 'before' | 'after';
	timeout?: number;
	chunkSize?: number;
	concurrency?: number;
	ordered?: boolean;
}

export interface IAstraResponse extends IDataObject {
	operation: string;
	success: boolean;
	insertedId?: string;
	insertedIds?: string[];
	acknowledged?: boolean;
	insertedCount?: number;
	matchedCount?: number;
	modifiedCount?: number;
	deletedCount?: number;
	document?: IDataObject;
	count?: number;
	data?: IDataObject;
}