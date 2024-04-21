import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fetchPRs, run } from "./get-pull-request.js";

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
  let mockFetch;

  beforeEach(() => {
    vi.stubEnv("LEAD_TIME_URL", "https://example.com/");
    mockFetch = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
    });
  });

  afterEach(() => {
    mockFetch.mockRestore();
    vi.unstubAllEnvs();
  });

  test("graphqlWithAuthを使ってデータをフェッチする", async () => {
    // given

    // when
    const result = await fetchPRs([]);

    // then
    expect(result.length).toEqual(2); // モックから期待される結果
  });
  test("runの長いテスト", async () => {
    // given

    // when
    await run();

    // then
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const firstCallArgs = mockFetch.mock.calls[0];
    expect(firstCallArgs[0]).toStrictEqual(expect.any(String)); // URL
    expect(firstCallArgs[1].method).toBe("POST");
    expect(firstCallArgs[1].body.get("entry.1737429438")).toBe("1");
    expect(firstCallArgs[1].headers).toStrictEqual({
      "Content-Type": "application/x-www-form-urlencoded",
    });

    const secondCallArgs = mockFetch.mock.calls[1];
    expect(secondCallArgs[0]).toStrictEqual(expect.any(String)); // URL
    expect(secondCallArgs[1].method).toBe("POST");
    expect(secondCallArgs[1].body.get("entry.1737429438")).toBe("2");
    expect(secondCallArgs[1].headers).toStrictEqual({
      "Content-Type": "application/x-www-form-urlencoded",
    });
  });
});
