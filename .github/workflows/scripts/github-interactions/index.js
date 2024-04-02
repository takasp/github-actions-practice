import { graphql } from "@octokit/graphql";

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_TOKEN}`,
  },
});

const toJSTString = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  date.setHours(date.getHours() + 9); // Convert to JST
  return date
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/, "")
    .replace(/-/g, "/")
    .slice(0, -3);
};

const getMinDate = (dates) => {
  const validDates = dates.filter((date) => date);
  return validDates.length > 0
    ? new Date(Math.min(...validDates.map((date) => new Date(date))))
    : null;
};
const isCommaSeparatedNumbers = (input) => {
  const parts = input.split(",");
  return parts.every(
    (part) => !Number.isNaN(Number.parseFloat(part)) && Number.isFinite(part),
  );
};

const fetchPRs = async (owner, repo, prNumbers) => {
  let allPRs = [];
  if (prNumbers.length > 0) {
    // マージしたPRまたは指定したPRを取得
    for (const prNumber of prNumbers) {
      const prQuery = `
                  query ($owner: String!, $repo: String!, $number: Int!) {
                    repository(owner: $owner, name: $repo) {
                      pullRequest(number: $number) {
                        number
                        createdAt
                        mergedAt
                        baseRefName
                        headRefName
                        author {
                          login
                        }
                        repository {
                          nameWithOwner
                        }
                        commits(first: 1) {
                          nodes {
                            commit {
                              authoredDate
                              committedDate
                            }
                          }
                        }
                      }
                    }
                  }
                `;

      const result = await graphqlWithAuth(prQuery, {
        owner,
        repo,
        number: prNumber,
      });

      // GraphQLでマージされた条件を指定できないのでここでマージされたPRを対象に取得する
      if (result.repository.pullRequest?.mergedAt) {
        allPRs.push(result.repository.pullRequest);
      }
    }
  } else {
    // 全てのマージされたPRを取得
    let cursor = null;
    let hasNextPage = true;

    const pageQuery = `
                query ($owner: String!, $repo: String!, $cursor: String) {
                  repository(owner: $owner, name: $repo) {
                    pullRequests(states: MERGED, first: 100, after: $cursor) {
                      edges {
                        node {
                          number
                          createdAt
                          mergedAt
                          baseRefName
                          headRefName
                          author {
                            login
                          }
                          repository {
                            nameWithOwner
                          }
                          commits(first: 1) {
                            nodes {
                              commit {
                                authoredDate
                                committedDate
                              }
                            }
                          }
                        }
                      }
                      pageInfo {
                        endCursor
                        hasNextPage
                      }
                    }
                  }
                }
              `;
    while (hasNextPage) {
      const result = await graphqlWithAuth(pageQuery, {
        owner,
        repo,
        cursor,
      });

      allPRs = allPRs.concat(
        result.repository.pullRequests.edges.map((edge) => edge.node),
      );
      cursor = result.repository.pullRequests.pageInfo.endCursor;
      hasNextPage = result.repository.pullRequests.pageInfo.hasNextPage;
    }
  }
};

// 取得したPR情報を加工する関数
const processPRs = async (allPRs) => {
  return allPRs
    .map((pr) => {
      // authorがないのはCloseされたPRの可能性があるのでスキップ
      if (pr.author === null) return null;

      // commitがないPRが存在する場合があるのでスキップ
      const firstCommit =
        pr.commits.nodes.length > 0 ? pr.commits.nodes[0].commit : null;
      if (!firstCommit) return null;

      const createdAt = pr.createdAt;
      const firstCommitAt = firstCommit.committedDate;
      const firstCommitAuthoredAt = firstCommit.authoredDate;

      // 日付が不足している場合はスキップ
      if (!createdAt || !firstCommitAt || !firstCommitAuthoredAt) return null;

      // PRの作成時刻:createdAt, 最初のコミットを取り込んだ時刻:firstCommitAt, 最初のコミット作成時刻:firstCommitAuthoredAtのいずれかミニマムを取得
      // AuthorDateが更新されないことを前提に最初の活動の時刻を取得するのが目的
      const firstCreated = getMinDate([
        createdAt,
        firstCommitAt,
        firstCommitAuthoredAt,
      ]);

      return {
        number: pr.number,
        created_at: pr.createdAt,
        merged_at: pr.mergedAt,
        first_commit_at: firstCommitAt,
        first_commit_author_date: firstCommitAuthoredAt,
        repository: pr.repository.nameWithOwner,
        author: pr.author ? pr.author.login : "unknown",
        base: pr.baseRefName,
        head: pr.headRefName,
        jst_merged_at: toJSTString(pr.mergedAt),
        jst_first_created: toJSTString(firstCreated.toISOString()),
      };
    })
    .filter((pr) => pr !== null) // スキップしたnullをフィルタリングして削除
    .sort((a, b) => a.number - b.number);
};

const postData = async (data) => {
  const url = process.env.LEAD_TIME_URL;
  let errorOccurred = false;
  for (const pr of data) {
    try {
      const formData = new URLSearchParams();
      formData.append("entry.1737429438", pr.number);
      formData.append("entry.696990060", pr.created_at);
      formData.append("entry.883568870", pr.merged_at);
      formData.append("entry.1542610687", pr.first_commit_at);
      formData.append("entry.400445109", pr.first_commit_author_date);
      formData.append("entry.1770012755", pr.repository);
      formData.append("entry.1888619409", pr.author);
      formData.append("entry.864339788", pr.base);
      formData.append("entry.1775356616", pr.head);
      formData.append("entry.1457774321", pr.jst_merged_at);
      formData.append("entry.1401680068", pr.jst_first_created);
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

const run = async () => {
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  console.log({ owner });
  console.log({ repo });

  const prNumbersInput = process.env.PR_NUMBERS;
  let prNumbers = [];

  if (prNumbersInput) {
    if (!isCommaSeparatedNumbers(prNumbersInput)) {
      throw new Error(
        `Invalid PR_NUMBERS: ${prNumbersInput} is not a valid comma-separated numbers string`,
      );
    }
    prNumbers = prNumbersInput
      .split(",")
      .map((num) => Number.parseInt(num.trim(), 10));
  }

  try {
    console.log("-----------");
    const allPRs = await fetchPRs(owner, repo, prNumbers);
    console.log({ allPRs });
    const mergedPRs = await processPRs(allPRs);
    console.log("mergedPRs:", mergedPRs.length, "件");
    await postData(mergedPRs);
  } catch (error) {
    console.error("Error during script execution:", error);
  }
};

await run().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
