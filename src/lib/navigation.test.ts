import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { getBackDestination, getSwipeDestination, showMainTabs } from "./navigation";

function expect(actual: unknown) {
  return {
    toEqual: (expected: unknown) => assert.deepEqual(actual, expected),
    toBe: (expected: unknown) => assert.equal(actual, expected),
    toBeNull: () => assert.equal(actual, null),
  };
}

describe("Study back hierarchy", () => {
  test("reading returns to that subject's units, not previous reading", () => {
    expect(getBackDestination("/studying/12/biology/reading/3/3.1")).toEqual({
      to: "/studying/$grade/$subject", params: { grade: "12", subject: "biology" },
    });
  });
  test("units return to subjects for the same grade", () => {
    expect(getBackDestination("/studying/12/biology/")).toEqual({
      to: "/studying/$grade", params: { grade: "12" },
    });
  });
  test("subjects return to grade selection", () => {
    expect(getBackDestination("/studying/12")).toEqual({ to: "/studying" });
  });
  test("grade selection returns to Home", () => {
    expect(getBackDestination("/studying/")).toEqual({ to: "/" });
  });
  test("Home has no parent and is the only exit point", () => {
    expect(getBackDestination("/")).toBeNull();
    expect(getBackDestination("/exam")).toEqual({ to: "/" });
  });
});

test("tabs disappear after grade selection", () => {
  expect(showMainTabs("/studying/")).toBe(true);
  expect(showMainTabs("/studying/12")).toBe(false);
  expect(showMainTabs("/studying/12/biology")).toBe(false);
  expect(showMainTabs("/studying/12/biology/reading/3/1")).toBe(false);
});

test("swipes follow Home, Study, Exam, AI with no wraparound", () => {
  expect(getSwipeDestination("/", -100, 0)).toBe("/studying");
  expect(getSwipeDestination("/studying/", -100, 0)).toBe("/exam");
  expect(getSwipeDestination("/exam", -100, 0)).toBe("/lounge");
  expect(getSwipeDestination("/lounge", 100, 0)).toBe("/exam");
  expect(getSwipeDestination("/", 100, 0)).toBeNull();
  expect(getSwipeDestination("/lounge", -100, 0)).toBeNull();
});

test("vertical scrolling and nested study screens never change tabs", () => {
  expect(getSwipeDestination("/studying", -100, 150)).toBeNull();
  expect(getSwipeDestination("/studying/12/biology", -100, 0)).toBeNull();
});