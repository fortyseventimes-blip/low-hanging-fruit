import { describe, expect, it } from "vitest";
import {
  buildSkillAdjacency,
  connectionVisualState,
  isConnectionActive,
  isConnectionMuted,
  isSkillMuted,
} from "./skill-connections";

describe("buildSkillAdjacency", () => {
  it("is bidirectional even though edges are directed", () => {
    const adjacency = buildSkillAdjacency([{ fromSkillId: "a", toSkillId: "b" }]);
    expect(adjacency.get("a")?.has("b")).toBe(true);
    expect(adjacency.get("b")?.has("a")).toBe(true);
  });

  it("collects multiple edges into one skill's neighbor set", () => {
    const adjacency = buildSkillAdjacency([
      { fromSkillId: "a", toSkillId: "b" },
      { fromSkillId: "a", toSkillId: "c" },
    ]);
    expect(adjacency.get("a")).toEqual(new Set(["b", "c"]));
  });
});

describe("isSkillMuted", () => {
  const adjacency = buildSkillAdjacency([{ fromSkillId: "a", toSkillId: "b" }]);

  it("mutes nothing when no node is hovered", () => {
    expect(isSkillMuted("c", null, adjacency)).toBe(false);
  });

  it("does not mute the hovered node itself", () => {
    expect(isSkillMuted("a", "a", adjacency)).toBe(false);
  });

  it("does not mute a direct neighbor of the hovered node", () => {
    expect(isSkillMuted("b", "a", adjacency)).toBe(false);
  });

  it("mutes a node with no connection to the hovered node", () => {
    expect(isSkillMuted("c", "a", adjacency)).toBe(true);
  });
});

describe("isConnectionActive / isConnectionMuted", () => {
  const edge = { fromSkillId: "a", toSkillId: "b" };

  it("is active when hovering either endpoint", () => {
    expect(isConnectionActive(edge, "a")).toBe(true);
    expect(isConnectionActive(edge, "b")).toBe(true);
  });

  it("is inactive and unmuted when nothing is hovered", () => {
    expect(isConnectionActive(edge, null)).toBe(false);
    expect(isConnectionMuted(edge, null)).toBe(false);
  });

  it("is muted when a different node is hovered", () => {
    expect(isConnectionMuted(edge, "c")).toBe(true);
  });

  it("is not muted when it's the active connection", () => {
    expect(isConnectionMuted(edge, "a")).toBe(false);
  });
});

describe("connectionVisualState", () => {
  const edge = { fromSkillId: "a", toSkillId: "b" };

  it("prefers active over passed when the hovered node is an endpoint", () => {
    expect(connectionVisualState(edge, "a", true)).toBe("active");
  });

  it("is passed when both ends cleared cohort and nothing relevant is hovered", () => {
    expect(connectionVisualState(edge, null, true)).toBe("passed");
    expect(connectionVisualState(edge, "c", true)).toBe("passed");
  });

  it("falls back to default otherwise", () => {
    expect(connectionVisualState(edge, null, false)).toBe("default");
    expect(connectionVisualState(edge, "c", false)).toBe("default");
  });
});
