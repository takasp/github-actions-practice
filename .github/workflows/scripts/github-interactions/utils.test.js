import test from "node:test";
import assert from "node:assert";
import { getMinDate, toJSTString } from "./utils.js";

test("toJSTString", () => {
  // given
  const expected = "2024/01/01 09:00";

  // when
  const actual = toJSTString(new Date("2024-01-01T00:00:00.999Z"));

  // then
  assert.deepStrictEqual(actual, expected);
});

test("getMinDate", () => {
  // given
  const expected = new Date("2024-01-01T00:00:00.999Z");

  // when
  const actual = getMinDate([
    new Date("2024-01-01T00:00:00.999Z"),
    new Date("2024-01-05T00:00:00.999Z"),
    new Date("2024-01-03T00:00:00.999Z"),
  ]);

  // then
  assert.deepStrictEqual(actual, expected);
});
