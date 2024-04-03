import { graphql } from "@octokit/graphql";
import { Octokit } from "@octokit/rest";

const githubToken = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: githubToken });

const restWithAuth = async (method, params) => {
  try {
    const response = await octokit.rest.actions[method](params);
    console.log("method:", method)
    console.log("response:", JSON.stringify(response));
    return response.data;
  } catch (error) {
    console.error(`Error calling ${method}:`, error);
    throw error; // エラーを再スローして、呼び出し元で処理できるようにする
  }
};

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${githubToken}`,
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

export {
  restWithAuth,
  graphqlWithAuth,
  toJSTString,
  getMinDate,
  isCommaSeparatedNumbers,
};
