import { describe, expect, test } from "@jest/globals";

import { joinPath } from "./helpers";

describe("#joinPath", () => {
  test("given two paths to join, it should return the joined path", () => {
    const result = joinPath("path1", "path2");
    expect(result).toBe("path1/path2");
  });

  test("given three paths to join, it should return the joined path", () => {
    const result = joinPath("path1", "path2", "path3");
    expect(result).toBe("path1/path2/path3");
  });

  test("given a path with leading slash and another path, it should return the joined path without duplicate slashes", () => {
    const result = joinPath("/path1", "path2");
    expect(result).toBe("/path1/path2");
  });

  test("given undefined and a path with leading slash, it should keep the first slash", () => {
    const result = joinPath(undefined, "/path1", "path2");
    expect(result).toBe("/path1/path2");
  });

  test("given a single slash leading slash, it should not double it", () => {
    const result = joinPath("/", "/path1", "path2");
    expect(result).toBe("/path1/path2");
  });

  test("given a path without leading slash and another path with leading slash, it should return the joined path without duplicate slashes", () => {
    const result = joinPath("path1", "/path2");
    expect(result).toBe("path1/path2");
  });

  test("given a path with trailing slash and another path, it should return the joined path without duplicate slashes", () => {
    const result = joinPath("path1/", "path2");
    expect(result).toBe("path1/path2");
  });

  test("given multiple paths with duplicate slashes, it should return the joined path without duplicate slashes", () => {
    const result = joinPath("path1//", "/path2///", "//path3");
    expect(result).toBe("path1/path2/path3");
  });

  test("given a path segment with a protocol, it should keep the protocl intact", () => {
    const result = joinPath("https://", "example.com/", "/foo");
    expect(result).toBe("https://example.com/foo");
  });

  test("given empty paths, it should return an empty string", () => {
    const result = joinPath("", "", "");
    expect(result).toBe("");
  });
});
