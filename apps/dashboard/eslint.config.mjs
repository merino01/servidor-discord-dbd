// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs"

export default withNuxt(
	// Your custom configs here
	{
		rules: {
			"indent": ["error", "tab"],
			"quotes": ["error", "double"],
			"semi": ["error", "never"],
			"no-unused-vars": "warn",
			"eol-last": ["error", "always"],
			"no-multiple-empty-lines": ["error", { "max": 1 }],
			"object-curly-spacing": ["error", "always"],
			"space-before-function-paren": ["error", "always"],
			"comma-dangle": ["error", "never"],
			"arrow-body-style": ["error", "as-needed"],
			"arrow-parens": ["error", "always"],
			"arrow-spacing": ["error", { "before": true, "after": true }],
			"prefer-arrow-callback": ["error", { "allowNamedFunctions": false }],
			"implicit-arrow-linebreak": ["error", "beside"],
			"no-confusing-arrow": ["error", { "allowParens": true }],
			"no-var": "error",
			"prefer-const": "error",
			"no-use-before-define": [
				"error",
				{ "functions": false, "classes": true, "variables": false }
			],
			"eqeqeq": ["error", "always"],
			"curly": ["error", "all"],
			"no-implicit-coercion": ["error", { "allow": [] }],
			"no-trailing-spaces": "error",
			"max-len": [
				"error",
				{
					"code": 120,
					"ignoreComments": true,
					"ignoreUrls": true,
					"ignorePattern": "class=[\"']([\\s\\S]*?)[\"']"
				}
			],
			"no-unused-expressions": ["error", { "allowShortCircuit": true, "allowTernary": true }],
			"no-shadow": "error",
			"complexity": ["error", 10],
			"max-params": ["error", 4],
			"no-useless-return": "error",
			"prefer-spread": "error",
			"max-lines-per-function": ["error", 60],
			"brace-style": ["error", "1tbs", { "allowSingleLine": true }],
			"object-shorthand": ["error", "always"]
		}
	}
)
