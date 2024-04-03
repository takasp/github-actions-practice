import {describe, test} from "node:test";
import assert from "node:assert";
import {getMinDate, isCommaSeparatedNumbers, toJSTString} from "./utils.js";

describe("toJSTString", () => {
  test("日付を与えた場合日本時間の「yyyy/MM/dd HH:mm」の形式で返す", () => {
    assert.deepStrictEqual(toJSTString(new Date("2024-01-01T00:00:00.999Z")), "2024/01/01 09:00");
  });

  test('空文字を与えた場合nullを返す', () => {
    assert.strictEqual(toJSTString(''), null);
  });

  test('nullを与えた場合nullを返す', () => {
    assert.strictEqual(toJSTString(null), null);
  });

  test('undefinedを与えた場合nullを返す', () => {
    assert.strictEqual(toJSTString(undefined), null);
  });
})

describe('getMinDate', () => {
  test('有効な日付の配列を与えた場合、最も早い日付を返す', () => {
    const dates = ['2024-01-01T00:00:00.999Z', '2024-01-05T00:00:00.999Z', '2024-01-03T00:00:00.999Z'];
    assert.deepStrictEqual(getMinDate(dates), new Date('2024-01-01T00:00:00.999Z'));
  });

  test('配列に無効な日付が含まれている場合、無効な日付を無視して最も早い日付を返す', () => {
    const dates = ['2024-01-01T00:00:00.999Z', '', '2024-01-05T00:00:00.999Z', null, '2024-01-03T00:00:00.999Z'];
    assert.deepStrictEqual(getMinDate(dates), new Date('2024-01-01T00:00:00.999Z'));
  });

  test('すべての日付が無効な場合nullを返す', () => {
    const dates = ['', null, undefined];
    assert.deepStrictEqual(getMinDate(dates), null);
  });

  test('空の配列を与えた場合nullを返す', () => {
    const dates = [];
    assert.deepStrictEqual(getMinDate(dates), null);
  });
})

describe("isCommaSeparatedNumbers", () => {
  test('カンマ区切りの数値の場合trueを返す', () => {
    assert.deepStrictEqual(isCommaSeparatedNumbers('1,2,3'), true);
  });

  test('空文字列の場合falseを返す', () => {
    assert.equal(isCommaSeparatedNumbers(''), false);
  });

  test('数値以外の文字を含む場合falseを返す', () => {
    assert.equal(isCommaSeparatedNumbers('1,a,3'), false);
  });

  test('数値とカンマのみを含むが不正なフォーマットの場合falseを返す', () => {
    assert.equal(isCommaSeparatedNumbers('1,,3'), false);
  });

  test('空白を含む数値の場合trueを返す', () => {
    assert.equal(isCommaSeparatedNumbers('1, 2, 3'), true);
  });
})

