/** @type {import('jest').Config} */
module.exports = {
	clearMocks: true,
	collectCoverageFrom: ['src/**/*.ts', '!src/**/index.ts', '!src/**/*.types.ts'],
	coverageDirectory: 'coverage',
	extensionsToTreatAsEsm: ['.ts'],
	moduleFileExtensions: ['js', 'json', 'ts'],
	testEnvironment: 'node',
	testMatch: ['<rootDir>/test/**/*.spec.ts'],
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', useESM: true }],
	},
};
