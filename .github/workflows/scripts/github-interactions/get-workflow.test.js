import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  fetchWorkflows,
  postData,
  processWorkflowRuns,
  run,
} from "./get-workflow.js";

vi.stubEnv("DEPLOYMENT_FREQUENCY_URL", "https://example.com/");

const { restWithAuthMock } = vi.hoisted(() => {
  return {
    restWithAuthMock: vi.fn(),
  };
});
vi.mock("./utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    restWithAuth: restWithAuthMock,
  };
});

describe("run", () => {
  let mockFetch;

  beforeEach(() => {
    restWithAuthMock.mockReturnValueOnce({
      total_count: 2,
      workflow_runs: [
        {
          id: 30433642,
          run_number: 1,
          updated_at: "2022-01-01T00:00:00Z",
          repository: {
            name: "exampleRepo",
          },
          triggering_actor: {
            login: "user1",
          },
        },
        {
          id: 31533642,
          run_number: 2,
          updated_at: "2022-01-01T00:00:00Z",
          repository: {
            name: "exampleRepo",
          },
          triggering_actor: {
            login: "user1",
          },
        },
      ],
    });
    // 2回目の呼び出しで終了するようにする
    restWithAuthMock.mockReturnValue({ total_count: 0, workflow_runs: [] });
  });

  afterEach(() => {
    mockFetch.mockRestore();
    restWithAuthMock.mockClear();
  });

  test("Workflowの実行結果を取得し、外部にリクエストできる", async () => {
    // given
    mockFetch = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
    });

    // when
    await run();

    // then
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const firstCallArgs = mockFetch.mock.calls[0];
    expect(firstCallArgs[0]).toStrictEqual(expect.any(String)); // URL
    expect(firstCallArgs[1].method).toBe("POST");
    expect(firstCallArgs[1].body.get("entry.1787920898")).toBe("30433642");
    expect(firstCallArgs[1].headers).toStrictEqual({
      "Content-Type": "application/x-www-form-urlencoded",
    });

    const secondCallArgs = mockFetch.mock.calls[1];
    expect(secondCallArgs[0]).toStrictEqual(expect.any(String)); // URL
    expect(secondCallArgs[1].method).toBe("POST");
    expect(secondCallArgs[1].body.get("entry.1787920898")).toBe("31533642");
    expect(secondCallArgs[1].headers).toStrictEqual({
      "Content-Type": "application/x-www-form-urlencoded",
    });
  });

  test("エラーが発生した場合ハンドリングできる", async () => {
    // given
    vi.spyOn(global, "fetch").mockRejectedValue(Error("Failed to fetch data"));

    // when & then;
    await expect(run()).rejects.toThrow(
      'process.exit unexpectedly called with "1"',
    );
  });
});

describe("fetchWorkflows", () => {
  afterEach(() => {
    restWithAuthMock.mockClear();
  });

  test("runIdsを指定した場合はrunId指定で複数件まとめて一度に取得できないので一件ずつ取得する", async () => {
    // given
    const eventName = "workflow_dispatch";
    const workflowId = "hadolint.yml";
    const runIds = [30433642, 31533642];

    const mockWorkflows = [
      {
        id: 30433642,
        run_number: 1,
        // ... 他のプロパティは省略
      },
      {
        id: 31533642,
        run_number: 2,
        // ... 他のプロパティは省略
      },
    ];

    restWithAuthMock.mockResolvedValueOnce({
      data: mockWorkflows[0],
    });

    restWithAuthMock.mockResolvedValueOnce({
      data: mockWorkflows[1],
    });

    // when
    const result = await fetchWorkflows(eventName, workflowId, runIds);

    // then
    expect(result).toEqual(mockWorkflows);
    expect(restWithAuthMock).toHaveBeenCalledTimes(2);

    const firstCallArgs = restWithAuthMock.mock.calls[0][1];
    expect(firstCallArgs.run_id).toBe(30433642);

    const secondCallArgs = restWithAuthMock.mock.calls[1][1];
    expect(secondCallArgs.run_id).toBe(31533642);
  });

  test("runIdsを指定しない場合は全件取得する", async () => {
    // given
    const eventName = "workflow_dispatch";
    const workflowId = "hadolint.yml";

    restWithAuthMock.mockResolvedValueOnce({
      total_count: 2,
      workflow_runs: [
        {
          id: 30433642,
          run_number: 1,
          // ... 他のプロパティは省略
        },
        {
          id: 31533642,
          run_number: 2,
          // ... 他のプロパティは省略
        },
      ],
    });
    // 2回目の呼び出しで終了するようにする
    restWithAuthMock.mockReturnValue({ total_count: 0, workflow_runs: [] });

    // when
    const result = await fetchWorkflows(eventName, workflowId, []);

    // then
    expect(result.length).toEqual(2);
  });
});

describe("processWorkflowRuns", () => {
  test("Workflowの実行結果を渡すと外部にリクエストするための形式に整形できる", async () => {
    const mockWorkflows = [
      {
        id: 30433642,
        run_number: 1,
        updated_at: "2022-01-01T00:00:00Z",
        repository: {
          name: "exampleRepo",
        },
        triggering_actor: {
          login: "user1",
        },
      },
      {
        id: 31533642,
        run_number: 2,
        updated_at: "2022-01-01T00:00:00Z",
        repository: {
          name: "exampleRepo",
        },
        triggering_actor: {
          login: "user1",
        },
      },
    ];

    const result = await processWorkflowRuns(mockWorkflows);

    // then
    expect(result[0].number).toEqual(1);
    expect(result[0].run_id).toEqual(30433642);
    expect(result[0].released_at).toEqual("2022-01-01T00:00:00Z");
    expect(result[0].repository).toEqual("exampleRepo");
    expect(result[0].author).toEqual("user1");
    expect(result[0].jst_released_at).toEqual("2022/01/01 09:00");

    expect(result[1].number).toEqual(2);
    expect(result[1].run_id).toEqual(31533642);
    expect(result[1].released_at).toEqual("2022-01-01T00:00:00Z");
    expect(result[1].repository).toEqual("exampleRepo");
    expect(result[1].author).toEqual("user1");
    expect(result[1].jst_released_at).toEqual("2022/01/01 09:00");
  });

  test("Workflowの実行結果が0件のときエラーがスローされる", async () => {
    // given

    // when & then
    await expect(processWorkflowRuns([])).rejects.toThrow("No Workflows found");
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

  test("データを外部にリクエストできる", async () => {
    // given
    const mockData = [
      {
        run_id: 30433642,
        number: 1,
        released_at: "2022-01-01T00:00:00Z",
        repository: "exampleRepo",
        author: "user1",
        jst_released_at: "2022/01/01 09:00",
      },
    ];

    // when
    await postData(mockData);

    // then
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toStrictEqual(expect.any(String)); // URL
    expect(callArgs[1].method).toBe("POST");
    expect(callArgs[1].body.get("entry.1787920898")).toBe("30433642");
    expect(callArgs[1].headers).toStrictEqual({
      "Content-Type": "application/x-www-form-urlencoded",
    });
  });

  test("エラー発生時にエラーがスローされる", async () => {
    // given
    const mockData = [
      {
        run_id: 30433642,
        number: 1,
        // ... 他のプロパティは省略
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
