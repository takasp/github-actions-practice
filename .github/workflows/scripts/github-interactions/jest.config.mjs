/** @type {import('jest').Config} */
const config = {
	clearMocks: true,
	testEnvironment: "node",
	transform: {},
	transformIgnorePatterns: ["/node_modules/(?!@octokit/graphql)/"],
	moduleDirectories: ["node_modules", "<rootDir>"],
	moduleNameMapper: {
		"(.+)\\.js": "$1",
	},
};

export default config;
