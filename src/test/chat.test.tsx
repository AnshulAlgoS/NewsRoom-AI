import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ chat: vi.fn() }));
vi.mock("@/lib/ai", () => ({ processUserChat: mocks.chat }));
vi.mock("gsap", () => ({ gsap: { fromTo: vi.fn() } }));
import ChatSidebar from "@/components/app/ChatSidebar";
beforeEach(() => { cleanup(); vi.clearAllMocks(); Element.prototype.scrollIntoView = vi.fn(); });
describe("chat sends", () => {
  it("prevents duplicate in-flight messages and applies a completed AI reply", async () => {
    let resolveReply!: (value: unknown) => void;
    mocks.chat.mockImplementation(() => new Promise(resolve => { resolveReply = resolve; }));
    const onAddTodos = vi.fn(), onUpdateProfile = vi.fn();
    render(<ChatSidebar userProfile={null} activeTarget={undefined} onProfileEdit={vi.fn()} onUpdateProgress={vi.fn()} onAddTodo={vi.fn()} onAddTodos={onAddTodos} onUpdateProfile={onUpdateProfile} />);
    const input = screen.getByLabelText("Chat message");
    fireEvent.change(input, { target: { value: "I will study React today" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mocks.chat).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Send message")).toBeDisabled();
    resolveReply({ response: "React plan ready", todoUpdates: [{ text: "Study React", category: "learning" }], profileUpdates: { semester: 3 } });
    await screen.findByText("React plan ready");
    expect(onAddTodos).toHaveBeenCalledWith([{ text: "Study React", category: "learning" }]);
    expect(onUpdateProfile).toHaveBeenCalledWith({ semester: 3 });
    await waitFor(() => expect(input).toBeEnabled());
  });
});
