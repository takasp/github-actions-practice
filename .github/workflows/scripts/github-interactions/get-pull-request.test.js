import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fetchPRs, postData, processPRs, run } from "./get-pull-request.js";

vi.stubEnv("LEAD_TIME_URL", "https://example.com/");

describe("run", () => {
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

    mockFetch = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
    });
  });

  afterEach(() => {
    mockFetch.mockRestore();
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

describe("fetchPRs", () => {
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

    mockFetch = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
    });
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  test("graphqlWithAuthを使ってデータをフェッチする", async () => {
    // given

    // when
    const result = await fetchPRs([]);

    // then
    expect(result.length).toEqual(2); // モックから期待される結果
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
    expect(result[0].number).toEqual(1);
    expect(result[0].created_at).toEqual("2022-01-01T00:00:00Z");
    expect(result[0].merged_at).toEqual("2022-01-02T00:00:00Z");
    expect(result[0].first_commit_at).toEqual("2022-01-01T02:00:00Z");
    expect(result[0].first_commit_author_date).toEqual("2022-01-01T01:00:00Z");
    expect(result[0].repository).toEqual("exampleOwner/exampleRepo");
    expect(result[0].base).toEqual("main");
    expect(result[0].head).toEqual("feature-branch");
    expect(result[0].jst_merged_at).toEqual("2022/01/02 09:00");
    expect(result[0].jst_first_created).toEqual("2022/01/01 09:00");
  });

  test("PRのauthorがnullの場合、nullを返すため2件中1件取得できる", async () => {
    // given
    const mockPRs = [
      {
        number: 1,
        createdAt: "2022-01-01T00:00:00Z",
        mergedAt: "2022-01-02T00:00:00Z",
        baseRefName: "main",
        headRefName: "feature-branch",
        author: null,
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
      {
        number: 2,
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
    expect(result.length).toEqual(1);
    expect(result[0].number).toEqual(2);
  });

  test("PRのcommitが存在しない場合、nullを返す2件中1件取得できる", async () => {
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
          nodes: [],
        },
      },
      {
        number: 2,
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
    expect(result.length).toEqual(1);
    expect(result[0].number).toEqual(2);
  });

  test("PRのcreatedAt、firstCommitAt、またはfirstCommitAuthoredAtのいずれかが存在しない場合、nullを返す2件中1件取得できる", async () => {
    // given
    const mockPRs = [
      {
        number: 1,
        createdAt: null,
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
      {
        number: 2,
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
    expect(result.length).toEqual(1);
    expect(result[0].number).toEqual(2);
  });

  test("マージされたPRが0件のときエラーがスローされる", async () => {
    // given

    // when & then
    await expect(processPRs([])).rejects.toThrow("No merged PRs found");
  });
});

describe("postData", () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
    });
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  test("postDataがデータをPOSTできること", async () => {
    // given
    const mockData = [
      {
        number: 1,
        created_at: "2022-01-01T00:00:00Z",
        merged_at: "2022-01-02T00:00:00Z",
        first_commit_at: "2022-01-01T02:00:00Z",
        first_commit_author_date: "2022-01-01T01:00:00Z",
        repository: "exampleOwner/exampleRepo",
        author: "user1",
        base: "main",
        head: "feature-branch",
        jst_merged_at: "2022/01/02 09:00",
        jst_first_created: "2022/01/01 09:00",
      },
    ];

    // when
    await postData(mockData);

    // then
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toStrictEqual(expect.any(String)); // URL
    expect(callArgs[1].method).toBe("POST");
    expect(callArgs[1].body.get("entry.1737429438")).toBe("1");
    expect(callArgs[1].headers).toStrictEqual({
      "Content-Type": "application/x-www-form-urlencoded",
    });
  });

  test("エラー発生時にエラーがスローされる", async () => {
    // given
    const mockData = [
      {
        number: 1,
        created_at: "2022-01-01T00:00:00Z",
        merged_at: "2022-01-02T00:00:00Z",
        first_commit_at: "2022-01-01T02:00:00Z",
        first_commit_author_date: "2022-01-01T01:00:00Z",
        repository: "exampleOwner/exampleRepo",
        author: "user1",
        base: "main",
        head: "feature-branch",
        jst_merged_at: "2022/01/02 09:00",
        jst_first_created: "2022/01/01 09:00",
      },
    ];
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve("Bad Request"),
    });

    // when & then
    await expect(postData(mockData)).rejects.toThrow(
      "One or more errors occurred during processing.",
    );
  });
});
