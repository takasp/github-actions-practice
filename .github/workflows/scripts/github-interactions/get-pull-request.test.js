import { describe, expect, test, vi } from "vitest";
import { fetchPRs } from "./get-pull-request.js";

vi.mock("./utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    graphqlWithAuth: vi.fn().mockImplementation((query, variables) => {
      const mockData = {
        repository: {
          pullRequests: {
            edges: [
              {
                node: {
                  number: 1,
                  createdAt: "2021-01-01T00:00:00Z",
                  mergedAt: "2021-01-02T00:00:00Z",
                  baseRefName: "main",
                  headRefName: "feature-branch",
                  author: {
                    login: "user1",
                  },
                  repository: {
                    nameWithOwner: "exampleOwner/exampleRepo",
                  },
                  commits: {
                    nodes: [
                      {
                        commit: {
                          authoredDate: "2021-01-01T01:00:00Z",
                          committedDate: "2021-01-01T02:00:00Z",
                        },
                      },
                    ],
                  },
                },
              },
              {
                node: {
                  number: 2,
                  createdAt: "2021-02-01T00:00:00Z",
                  mergedAt: "2021-02-02T00:00:00Z",
                  baseRefName: "main",
                  headRefName: "bugfix-branch",
                  author: {
                    login: "user2",
                  },
                  repository: {
                    nameWithOwner: "exampleOwner/exampleRepo",
                  },
                  commits: {
                    nodes: [
                      {
                        commit: {
                          authoredDate: "2021-02-01T01:00:00Z",
                          committedDate: "2021-02-01T02:00:00Z",
                        },
                      },
                    ],
                  },
                },
              },
            ],
            pageInfo: {
              endCursor: "cursor2",
              hasNextPage: false,
            },
          },
        },
      };

      return Promise.resolve(mockData);
    }),
  };
});

describe("get-pull-request", () => {
  test("graphqlWithAuthを使ってデータを正しくフェッチする", async () => {
    const result = await fetchPRs([]);
    expect(result.length).toEqual(2); // モックから期待される結果
    // run();
  });
});
