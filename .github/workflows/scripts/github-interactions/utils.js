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

export { graphqlWithAuth, toJSTString, getMinDate, isCommaSeparatedNumbers };
