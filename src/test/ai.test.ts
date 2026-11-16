import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { processUserChat, compareResumeWithJD } from "@/lib/ai";

const fetchMock = vi.fn();
const reply = (value: unknown) => fetchMock.mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(value) } }] }) });
beforeEach(() => { vi.stubEnv("VITE_NVIDIA_API_KEY", "test-key"); vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("dashboard AI chat", () => {
  it("keeps valid tasks and rejects malformed fields instead of breaking the dashboard", async () => {
    reply({ response: "Plan ready", profileUpdates: { semester: null, bio: null, achievements: ["Built React app", null] },
      todoUpdates: [null, { text: 42 }, { text: "Study React", category: 12 }], progressUpdates: { semesterProgress: 200 } });
    const result = await processUserChat("Study React", {});
    expect(result.response).toBe("Plan ready");
    expect(result.profileUpdates).toEqual({ achievements: ["Built React app"] });
    expect(result.todoUpdates).toEqual([{ text: "Study React", category: "other" }]);
    expect(result.progressUpdates).toBeUndefined();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe("nvidia/nemotron-3.5-super-vl-120b-a12b");
  });
  it("enforces a locked daily plan even if the model returns more tasks", async () => {
    reply({ response: "Plan locked", todoUpdates: [{ text: "New task", category: "learning" }] });
    const result = await processUserChat("Add a task", { dailyPlanStatus: { date: new Date().toLocaleDateString("en-CA"), isConfirmed: true } });
    expect(result.todoUpdates).toBeUndefined();
  });
  it("shows a recoverable reply when the model returns empty JSON", async () => {
    reply({});
    expect((await processUserChat("hello", {})).response).toContain("trouble updating");
  });
});

describe("resume comparison failures", () => {
  it("rejects incomplete responses rather than rendering a false score", async () => {
    reply({});
    await expect(compareResumeWithJD("resume", "target")).rejects.toThrow();
  });
});
