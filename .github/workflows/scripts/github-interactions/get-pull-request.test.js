import assert from "node:assert";

process.env.GITHUB_REPO_OWNER = "testOwner";
process.env.GITHUB_REPO_NAME = "testRepo";

import { jest } from "@jest/globals";
import { graphql } from "@octokit/graphql";
import { fetchPRs, run } from "./get-pull-request.js";
import * as utils from "./utils.js";

jest.unstable_mockModule("graphql", () => ({
	defaults: () =>
		jest.fn().mockImplementation((query, variables) => {
			// if (variables.owner === "testOwner" && variables.repo === "testRepo") {
			// }
			return Promise.resolve({ data: "mockData" }); // モックの応答
		}),
}));

describe("get-pull-request", () => {
	test("graphqlWithAuthを使ってデータを正しくフェッチする", async () => {
		const cursor = "testCursor";

		// fetchData関数の実行と結果の検証
		const result = await fetchPRs([1, 2, 3]);
		expect(result).toEqual({ data: "mockData" }); // モックから期待される結果
		// run();
	});
});
