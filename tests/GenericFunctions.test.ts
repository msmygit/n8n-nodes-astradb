import {
	validateAstraCredentialsRaw,
	validateKeyspaceCollectionName,
	validateQuery,
	parseAstraOptions,
	formatAstraResponse,
	generatePairedItemData,
	sanitizeInput,
} from '../nodes/AstraDb/v1/GenericFunctions';

// Mock node for testing
const mockNode = {
	name: 'Test Node',
	type: 'test',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
} as unknown;

describe('GenericFunctions', () => {
	describe('validateAstraCredentialsRaw', () => {
		it('should validate correct credentials', () => {
			const credentials = {
				endpoint: 'https://test-db-us-east1.apps.astra.datastax.com',
				token: 'AstraCS:test-token-1234567890',
			};

			const result = validateAstraCredentialsRaw(credentials);
			expect(result).toEqual({
				endpoint: 'https://test-db-us-east1.apps.astra.datastax.com',
				token: 'AstraCS:test-token-1234567890',
			});
		});

		it('should throw error for missing endpoint', () => {
			const credentials = {
				token: 'AstraCS:test-token-1234567890',
			};

			expect(() => validateAstraCredentialsRaw(credentials)).toThrow(
				'Astra DB endpoint is required'
			);
		});

		it('should throw error for missing token', () => {
			const credentials = {
				endpoint: 'https://test-db-us-east1.apps.astra.datastax.com',
			};

			expect(() => validateAstraCredentialsRaw(credentials)).toThrow(
				'Astra DB token is required'
			);
		});

		it('should throw error for invalid endpoint format', () => {
			const credentials = {
				endpoint: 'invalid-url',
				token: 'AstraCS:test-token-1234567890',
			};

			expect(() => validateAstraCredentialsRaw(credentials)).toThrow(
				'Invalid Astra DB endpoint format'
			);
		});

		it('should throw error for short token', () => {
			const credentials = {
				endpoint: 'https://test-db-us-east1.apps.astra.datastax.com',
				token: 'short',
			};

			expect(() => validateAstraCredentialsRaw(credentials)).toThrow(
				'Invalid Astra DB token format'
			);
		});
	});

	describe('validateKeyspaceCollectionName', () => {
		it('should validate correct names', () => {
			expect(() => validateKeyspaceCollectionName(mockNode, 'valid_name')).not.toThrow();
			expect(() => validateKeyspaceCollectionName(mockNode, 'ValidName123')).not.toThrow();
		});

		it('should throw error for empty name', () => {
			expect(() => validateKeyspaceCollectionName(mockNode, '')).toThrow(
				'name cannot be empty'
			);
		});

		it('should throw error for invalid characters', () => {
			expect(() => validateKeyspaceCollectionName(mockNode, 'invalid-name')).toThrow(
				'name must start with a letter'
			);
		});

		it('should throw error for reserved words', () => {
			expect(() => validateKeyspaceCollectionName(mockNode, 'system')).toThrow(
				'is a reserved word'
			);
		});
	});

	describe('validateQuery', () => {
		it('should validate correct query', () => {
			const query = { name: 'test', age: { $gte: 18 } };
			const result = validateQuery(mockNode, query);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject null query', () => {
			const result = validateQuery(mockNode, null);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('query cannot be null or undefined');
		});

		it('should reject non-object query', () => {
			const result = validateQuery(mockNode, 'string');
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('query must be an object');
		});

		it('should reject dangerous operators', () => {
			const query = { $where: 'malicious code' };
			const result = validateQuery(mockNode, query);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Unsupported query operator "$where"');
		});

		it('should warn for empty filter', () => {
			const result = validateQuery(mockNode, {}, 'filter');
			expect(result.isValid).toBe(true);
			expect(result.warnings).toContain('Empty filter will match all documents');
		});
	});

	describe('parseAstraOptions', () => {
		it('should parse valid options', () => {
			const options = {
				limit: 100,
				skip: 10,
				sort: { name: 1, age: -1 },
				projection: { name: 1, _id: 0 },
				upsert: true,
				returnDocument: 'after',
			};

			const result = parseAstraOptions(mockNode, options);
			expect(result).toEqual(options);
		});

		it('should clamp limit values', () => {
			const options = { limit: 2000 };
			expect(() => parseAstraOptions(mockNode, options)).toThrow(
				'Limit must be between 1 and 1000'
			);
		});

		it('should clamp skip values', () => {
			const options = { skip: -5 };
			expect(() => parseAstraOptions(mockNode, options)).toThrow(
				'Skip must be a non-negative number'
			);
		});

		it('should validate sort directions', () => {
			const options = { sort: { name: 2 } };
			expect(() => parseAstraOptions(mockNode, options)).toThrow(
				'Sort direction for field "name" must be 1 (ascending) or -1 (descending)'
			);
		});
	});

	describe('formatAstraResponse', () => {
		it('should format insertOne response', () => {
			const result = { insertedId: '123', acknowledged: true };
			const formatted = formatAstraResponse(result, 'insertOne');
			expect(formatted).toEqual({
				operation: 'insertOne',
				success: true,
				insertedId: '123',
				acknowledged: true,
			});
		});

		it('should format insertMany response', () => {
			const result = { insertedIds: ['123', '456'], acknowledged: true, insertedCount: 2 };
			const formatted = formatAstraResponse(result, 'insertMany');
			expect(formatted).toEqual({
				operation: 'insertMany',
				success: true,
				insertedIds: ['123', '456'],
				acknowledged: true,
				insertedCount: 2,
			});
		});

		it('should format updateMany response', () => {
			const result = { matchedCount: 5, modifiedCount: 3, acknowledged: true };
			const formatted = formatAstraResponse(result, 'updateMany');
			expect(formatted).toEqual({
				operation: 'updateMany',
				success: true,
				matchedCount: 5,
				modifiedCount: 3,
				acknowledged: true,
			});
		});
	});

	describe('generatePairedItemData', () => {
		it('should generate correct paired item data', () => {
			const result = generatePairedItemData(3);
			expect(result).toEqual([
				{ item: 0 },
				{ item: 1 },
				{ item: 2 },
			]);
		});

		it('should handle zero length', () => {
			const result = generatePairedItemData(0);
			expect(result).toEqual([]);
		});
	});

	describe('sanitizeInput', () => {
		it('should sanitize strings', () => {
			const input = 'test<script>alert("xss")</script>';
			const result = sanitizeInput(input);
			expect(result).toBe('testscriptalert("xss")/script');
		});

		it('should sanitize objects', () => {
			const input = { name: 'test<script>', value: 'normal' };
			const result = sanitizeInput(input);
			expect(result).toEqual({ name: 'testscript', value: 'normal' });
		});

		it('should sanitize arrays', () => {
			const input = ['normal', 'test<script>', 'another'];
			const result = sanitizeInput(input);
			expect(result).toEqual(['normal', 'testscript', 'another']);
		});

		it('should handle null and undefined', () => {
			expect(sanitizeInput(null)).toBe(null);
			expect(sanitizeInput(undefined)).toBe(undefined);
		});
	});
});
