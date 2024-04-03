import { graphql } from "@octokit/graphql";
import { Octokit } from "@octokit/rest";

const githubToken = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: githubToken });

const restWithAuth = async (method, params) => {
  try {
    const response = await octokit.rest.actions[method](params);
    console.log("method:", method);
    console.log("response:", JSON.stringify(response));
    return response.data;
  } catch (error) {
    console.error(`Error calling ${method}:`, error);
    throw error;
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
  if (input.trim() === "") {
    return false;
  }

  const parts = input.split(",");
  return parts.every((part) => {
    const trimmedPart = part.trim();
    if (trimmedPart === "") {
      return false; // 連続したカンマや、カンマの前後に空文字がある場合は不正なフォーマットと見なす
    }
    const number = Number.parseFloat(trimmedPart);
    return !Number.isNaN(number) && Number.isFinite(number); // トリムした部分が数値に変換可能かどうかをチェック
  });
};

export {
  restWithAuth,
  graphqlWithAuth,
  toJSTString,
  getMinDate,
  isCommaSeparatedNumbers,
};
