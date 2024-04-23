import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fetchPRs, processPRs, run } from "./get-pull-request.js";

describe("get-pull-request", () => {
  let mockFetch;

  beforeEach(() => {
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

describe("processPRs", () => {
  test("PRの作成日、最初のコミット日、最初のコミットのAuthorDateの中で最も早い日付がjst_first_createdとして返される", async () => {
    // given
    const mockPRs = [
      {
        number: 1,
        createdAt: "2022-01-01T00:00:00Z",
        mergedAt: "2022-01-02T00:00:00Z",
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
                authoredDate: "2022-01-01T01:00:00Z",
                committedDate: "2022-01-01T02:00:00Z",
              },
            },
          ],
        },
      },
    ];

    // when
    const result = await processPRs(mockPRs);

    // then
    expect(result[0].jst_first_created).toEqual("2022/01/01 09:00"); // createdAtが最も早い日付
  });

  test("マージされたPRが0件のときエラーがスローされる", async () => {
    // given

    // when & then
    await expect(processPRs([])).rejects.toThrow("No merged PRs found");
  });
});
