import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['coverage', 'dist', 'node_modules'],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	prettier,
	{
		files: ['**/*.ts'],
		languageOptions: {
			globals: globals.node,
			parserOptions: {
				ecmaVersion: 2022,
				sourceType: 'module',
			},
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		},
	},
);
