import { isCommaSeparatedNumbers, restWithAuth, toJSTString } from "./utils.js";

export const fetchWorkflows = async (eventName, workflowId, runIds) => {
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;

  const allWorkflowRuns = [];

  if (runIds.length > 0) {
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
  } else {
    const perPage = 100;
    let page = 1;
    while (true) {
      const { workflow_runs } = await restWithAuth("listWorkflowRuns", {
        owner,
        repo,
        workflow_id: workflowId,
        status: "success",
        per_page: perPage,
        page: page,
      });

      if (workflow_runs.length === 0) {
        break;
      }

      allWorkflowRuns.push(...workflow_runs);
      page++;
    }
  }
  return allWorkflowRuns;
};

export const processWorkflowRuns = async (allWorkflowRuns) => {
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

export const postData = async (data) => {
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

export const run = async () => {
  const eventName = process.env.EVENT_NAME;

  // TODO context.payload.workflow_run.idの対応も必要
  const workflowId = "hadolint.yml"; // IDではなく、workflowファイル名も指定できる
  const inputRunIds = process.env.RUN_IDS;

  let runIds = [];

  if (inputRunIds) {
    if (!isCommaSeparatedNumbers(inputRunIds)) {
      throw new Error(
        `Invalid inputRunIds: ${inputRunIds} is not a valid comma-separated ids string`,
      );
    }
    runIds = inputRunIds
      .split(",")
      .map((num) => Number.parseInt(num.trim(), 10));
    runIds.map((runId) => console.log(runId));
  }

  try {
    const allWorkflowRuns = await fetchWorkflows(eventName, workflowId, runIds);
    const deploymentFrequencyRawList =
      await processWorkflowRuns(allWorkflowRuns);
    await postData(deploymentFrequencyRawList);
  } catch (error) {
    console.error("Error during script execution:", error);
    process.exit(1);
  }
};

const args = process.argv.slice(2);
if (args[0] === "run") {
  run().then((r) => console.info("get-workflow completed"));
}
