import { describe, expect, test } from "vitest";
import { getMinDate, isCommaSeparatedNumbers, toJSTString } from "./utils.js";

describe("toJSTString", () => {
  test("日付を与えた場合日本時間の「yyyy/MM/dd HH:mm」の形式で返す", () => {
    expect(toJSTString(new Date("2024-01-01T00:00:00.999Z"))).toBe(
      "2024/01/01 09:00",
    );
  });

  test("空文字を与えた場合nullを返す", () => {
    expect(toJSTString("")).toBeNull();
  });

  test("nullを与えた場合nullを返す", () => {
    expect(toJSTString(null)).toBeNull();
  });

  test("undefinedを与えた場合nullを返す", () => {
    expect(toJSTString(undefined)).toBeNull();
  });
});

describe("getMinDate", () => {
  test("有効な日付の配列を与えた場合、最も早い日付を返す", () => {
    const dates = [
      "2024-01-01T00:00:00.999Z",
      "2024-01-05T00:00:00.999Z",
      "2024-01-03T00:00:00.999Z",
    ];
    expect(getMinDate(dates)).toEqual(new Date("2024-01-01T00:00:00.999Z"));
  });

  test("配列に無効な日付が含まれている場合、無効な日付を無視して最も早い日付を返す", () => {
    const dates = [
      "2024-01-01T00:00:00.999Z",
      "",
      "2024-01-05T00:00:00.999Z",
      null,
      "2024-01-03T00:00:00.999Z",
    ];
    expect(getMinDate(dates)).toEqual(new Date("2024-01-01T00:00:00.999Z"));
  });

  test("すべての日付が無効な場合nullを返す", () => {
    const dates = ["", null, undefined];
    expect(getMinDate(dates)).toBeNull();
  });

  test("空の配列を与えた場合nullを返す", () => {
    const dates = [];
    expect(getMinDate(dates)).toBeNull();
  });
});

describe("isCommaSeparatedNumbers", () => {
  test("カンマ区切りの数値の場合trueを返す", () => {
    expect(isCommaSeparatedNumbers("1,2,3")).toBe(true);
  });

  test("空文字列の場合falseを返す", () => {
    expect(isCommaSeparatedNumbers("")).toBe(false);
  });

  test("数値以外の文字を含む場合falseを返す", () => {
    expect(isCommaSeparatedNumbers("1,a,3")).toBe(false);
  });

  test("数値とカンマのみを含むが不正なフォーマットの場合falseを返す", () => {
    expect(isCommaSeparatedNumbers("1,,3")).toBe(false);
  });

  test("空白を含む数値の場合trueを返す", () => {
    expect(isCommaSeparatedNumbers("1, 2, 3")).toBe(true);
  });
});

// test
