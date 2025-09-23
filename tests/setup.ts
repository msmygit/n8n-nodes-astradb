// Test setup file for Jest
import 'jest';

// Mock console methods to reduce noise in tests
global.console = {
	...console,
	// Uncomment to ignore a specific log level
	// log: jest.fn(),
	// debug: jest.fn(),
	// info: jest.fn(),
	// warn: jest.fn(),
	// error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000);
