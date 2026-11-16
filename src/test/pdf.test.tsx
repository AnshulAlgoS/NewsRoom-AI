import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const mocks = vi.hoisted(() => ({ pdf: vi.fn(), compare: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock("pdfjs-dist", () => ({ GlobalWorkerOptions: {}, getDocument: mocks.pdf }));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }));
vi.mock("@/lib/ai", () => ({ compareResumeWithJD: mocks.compare }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: mocks.success, info: vi.fn() } }));
vi.mock("@/components/layout/PixelNavbar", () => ({ default: () => null }));
vi.mock("@/components/ui/PixelBackground", () => ({ PixelBackground: () => null }));
import ResumeComparatorPage from "@/pages/ResumeComparatorPage";
beforeEach(() => { cleanup(); vi.clearAllMocks(); });
function setup() {
  const view = render(<MemoryRouter><ResumeComparatorPage /></MemoryRouter>);
  fireEvent.click(screen.getAllByRole("button", { name: "Upload PDF" })[0]);
  return view.container.querySelector('input[type="file"]')!;
}
function upload(input: Element) {
  const file = new File(["test-pdf"], "resume.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => new ArrayBuffer(8) });
  fireEvent.change(input, { target: { files: [file] } });
}
function pdfWithText(text: string) {
  mocks.pdf.mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage: async () => ({ getTextContent: async () => ({ items: [{ str: text }] }) }) }) });
}
describe("PDF resume upload", () => {
  it("extracts selectable text into the resume editor", async () => {
    pdfWithText("Candidate React skills"); const input = setup(); upload(input);
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("PDF loaded successfully!"));
    fireEvent.click(screen.getAllByRole("button", { name: "Paste Text" })[0]);
    expect(screen.getByPlaceholderText("Paste a journalist portfolio, bylines and reporting experience...")).toHaveValue("Candidate React skills");
  });
  it("rejects a blank PDF and clears an earlier valid resume", async () => {
    pdfWithText("Earlier resume"); const input = setup(); upload(input);
    await waitFor(() => expect(mocks.success).toHaveBeenCalled());
    mocks.success.mockClear(); pdfWithText("   "); upload(document.querySelector('input[type="file"]')!);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("No selectable text")));
    expect(mocks.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "Paste Text" })[0]);
    expect(screen.getByPlaceholderText("Paste a journalist portfolio, bylines and reporting experience...")).toHaveValue("");
  });
  it("recovers from a corrupt PDF without allowing a comparison", async () => {
    mocks.pdf.mockReturnValue({ promise: Promise.reject(new Error("Invalid PDF structure.")) });
    const input = setup(); upload(input);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Invalid PDF structure."));
    fireEvent.click(screen.getByRole("button", { name: "Review profile" }));
    expect(mocks.compare).not.toHaveBeenCalled();
  });
});
