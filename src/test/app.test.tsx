import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
const mocks = vi.hoisted(() => ({ auth: { currentUser: { uid: "test-user" } as { uid: string } | null, onAuthStateChanged: vi.fn() }, getDoc: vi.fn(), setDoc: vi.fn() }));
vi.mock("@/lib/firebase", () => ({ auth: mocks.auth, db: {} }));
vi.mock("firebase/firestore", () => ({ doc: vi.fn(() => "users/test-user"), getDoc: mocks.getDoc, setDoc: mocks.setDoc }));
vi.mock("@/lib/ai", () => ({ expandProfileWithAI: vi.fn(), generateDailyPlan: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/app/ProfileSetupModal", () => ({ default: () => <div>Profile setup</div> }));
vi.mock("@/components/app/ChatSidebar", () => ({ default: ({ onUpdateProfile }: { onUpdateProfile: (p: object) => void }) => <button onClick={() => { onUpdateProfile({ semester: 3 }); onUpdateProfile({ bio: "Updated bio" }); }}>Apply AI updates</button> }));
vi.mock("@/components/app/Dashboard", () => ({ default: ({ userProfile }: { userProfile: { semester: number; bio?: string } | null }) => <div>{userProfile?.semester} / {userProfile?.bio}</div> }));
import AppPage from "@/pages/AppPage";
beforeEach(() => {
  cleanup(); vi.clearAllMocks(); mocks.auth.currentUser = { uid: "test-user" };
  mocks.auth.onAuthStateChanged.mockImplementation((callback: (user: unknown) => void) => { callback(mocks.auth.currentUser); return vi.fn(); });
  mocks.setDoc.mockResolvedValue(undefined);
  mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ name: "Test", semester: 2, currentDescription: "Current", targetDescription: "Target", todos: [{ id: "1", text: "Test task", date: new Date(), completed: false, category: "learning" }] }) });
});
const setup = () => render(<MemoryRouter initialEntries={["/app"]}><Routes><Route path="/app" element={<AppPage />} /><Route path="/auth" element={<div>Login required</div>} /></Routes></MemoryRouter>);
describe("dashboard profile", () => {
  it("preserves both same-turn updates and writes only changed fields", async () => {
    setup(); fireEvent.click(await screen.findByText("Apply AI updates"));
    await screen.findByText("3 / Updated bio");
    await waitFor(() => expect(mocks.setDoc).toHaveBeenCalledTimes(2));
    expect(mocks.setDoc.mock.calls.map(call => call[1])).toEqual([{ semester: 3 }, { bio: "Updated bio" }]);
  });
  it("redirects signed-out visitors instead of trapping them in unsavable setup", async () => {
    mocks.auth.currentUser = null; setup(); await screen.findByText("Login required");
    expect(screen.queryByText("Profile setup")).not.toBeInTheDocument();
  });
});
