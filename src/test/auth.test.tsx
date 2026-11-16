import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
const mocks = vi.hoisted(() => ({ login: vi.fn(), google: vi.fn(), toast: vi.fn() }));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({ signInWithEmailAndPassword: mocks.login, signInWithPopup: mocks.google, GoogleAuthProvider: class {}, createUserWithEmailAndPassword: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mocks.toast, success: vi.fn() } }));
vi.mock("@/components/ui/PixelBackground", () => ({ PixelBackground: () => null }));
vi.mock("@/components/ui/PixelMascot", () => ({ PixelMascot: () => null }));
import AuthPage from "@/pages/AuthPage";
beforeEach(() => { cleanup(); vi.clearAllMocks(); vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(); vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {}); });
const setup = () => render(<MemoryRouter initialEntries={["/auth"]}><Routes><Route path="/auth" element={<AuthPage />} /><Route path="/app" element={<div>Dashboard opened</div>} /></Routes></MemoryRouter>);
describe("login", () => {
  it("routes a successful email login to the dashboard", async () => {
    mocks.login.mockResolvedValue({ user: { uid: "test" } }); setup();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "example-password" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    await screen.findByText("Dashboard opened");
    expect(mocks.login).toHaveBeenCalledWith({}, "test@example.com", "example-password");
  });
  it("keeps the form usable and explains an invalid credential response", async () => {
    mocks.login.mockRejectedValue({ code: "auth/invalid-credential" }); setup();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith("Email or password is incorrect. Please try again."));
    expect(screen.getByRole("button", { name: /Sign in/i })).toBeEnabled();
  });
  it("explains an unauthorized Google login domain", async () => {
    mocks.google.mockRejectedValue({ code: "auth/unauthorized-domain" }); setup();
    fireEvent.click(screen.getByRole("button", { name: "Google" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining("not enabled for Google")));
    expect(screen.getByRole("button", { name: "Google" })).toBeEnabled();
  });
});
