import { restWithAuth, isCommaSeparatedNumbers, toJSTString } from "./utils.js";

const fetchWorkflows = async (eventName, workflowId, inputRunIds) => {
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;

  const allWorkflowRuns = [];
  const workflows = await restWithAuth("listRepoWorkflows", {
    owner,
    repo,
  });

  console.log(JSON.stringify(workflows));

  const workflow = await restWithAuth("getWorkflow", {
    owner,
    repo,
    workflow_id: workflowId,
  });
  console.log(JSON.stringify(workflow));

  if (eventName === "workflow_dispatch" && inputRunIds) {
    if (!isCommaSeparatedNumbers(inputRunIds)) {
      throw new Error(
        `Invalid inputRunIds: ${inputRunIds} is not a valid comma-separated ids string`,
      );
    }
    const runIds = inputRunIds
      .split(",")
      .map((num) => Number.parseInt(num.trim(), 10));
    const workflow_runs = await Promise.all(
      runIds.map(async (runId) => {
        const response = await restWithAuth("getWorkflowRun", {
          owner,
          repo,
          run_id: runId,
        });
        return response.data;
      }),
    );

    allWorkflowRuns.push(...workflow_runs);
  } else if (eventName === "workflow_dispatch") {
    const perPage = 100;
    let page = 1;
    while (true) {
      const {
        data,
      } = await restWithAuth("listWorkflowRuns", {
        owner,
        repo,
        workflow_id: workflowId,
        status: "success",
        per_page: perPage,
        page: page,
      });
      console.log("data:",JSON.stringify(data));

      if (data.workflow_runs.length === 0) {
        break;
      }

      allWorkflowRuns.push(...data.workflow_runs);
      page++;
    }
  } else if (eventName === "workflow_run") {
    console.log(
      "context.payload.workflow_run.id:",
      context.payload.workflow_run.id,
    );
    const { data } = await restWithAuth("getWorkflowRun", {
      owner,
      repo,
      run_id: context.payload.workflow_run.id,
    });
    allWorkflowRuns.push(...[data]);
  }
  return allWorkflowRuns;
};

const processPRs = async (allWorkflowRuns) => {
  const deploymentFrequencyRawList = allWorkflowRuns
    .map((workflowRun) => ({
      number: workflowRun.run_number,
      run_id: workflowRun.id,
      released_at: workflowRun.updated_at,
      repository: workflowRun.repository.name,
      author: workflowRun.triggering_actor.login,
      jst_released_at: toJSTString(workflowRun.updated_at),
    }))
    .sort((a, b) => a.number - b.number);
  if (deploymentFrequencyRawList.length === 0) {
    throw new Error("No Workflows found");
  }
  return deploymentFrequencyRawList;
};

const postData = async (data) => {
  const url = process.env.DEPLOYMENT_FREQUENCY_URL;
  let errorOccurred = false;
  for (const deploymentFrequencyRaw of data) {
    const formData = new URLSearchParams();
    formData.append("entry.1465423696", deploymentFrequencyRaw.number);
    formData.append("entry.1787920898", deploymentFrequencyRaw.run_id);
    formData.append("entry.1253201792", deploymentFrequencyRaw.released_at);
    formData.append("entry.151897309", deploymentFrequencyRaw.repository);
    formData.append("entry.1926035146", deploymentFrequencyRaw.author);
    formData.append("entry.1447505964", deploymentFrequencyRaw.jst_released_at);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!response.ok) {
        console.error(
          `Failed to post data: ${response.status} - ${await response.text()}`,
        );
        console.info(`formData: ${[...formData]}`);
        errorOccurred = true;
      }
    } catch (error) {
      console.error("Error:", error);
      console.info(`formData: ${[...formData]}`);
      errorOccurred = true;
    }
  }
  if (errorOccurred) {
    throw new Error("One or more errors occurred during processing.");
  }
};

// スクリプトのメインロジック
(async () => {
  try {
    const eventName = process.env.EVENT_NAME;
    const workflowId = "hadolint.yml"; // workflowファイル名も指定できる
    const inputRunIds = process.env.RUN_IDS;

    const allWorkflowRuns = await fetchWorkflows(
      eventName,
      workflowId,
      inputRunIds,
    );
    const deploymentFrequencyRawList = await processPRs(allWorkflowRuns);
    await postData(deploymentFrequencyRawList);
  } catch (error) {
    console.error("Error during script execution:", error);
    process.exit(1);
  }
})();
