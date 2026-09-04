import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import ChatScreen from "./ChatScreen";

const mockGetSession = vi.fn();
const mockSingle = vi.fn();
const mockToast = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: mockGetSession },
    from: () => ({
      select: () => ({
        eq: () => ({ single: mockSingle }),
      }),
    }),
  },
}));

const streamResponse = (chunks: string[], ok = true, status = 200) => {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return { ok, status, body, json: async () => ({ error: "Gateway error" }) } as Response;
};

describe("ChatScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingle.mockResolvedValue({ data: { streak_days: 7 }, error: null });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "session-token" } } });
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders the initial Compass greeting and user streak", async () => {
    render(<ChatScreen />);

    expect(await screen.findByText(/quando você se sente mais vivo/i)).toBeInTheDocument();
    expect(await screen.findByText("7 dias")).toBeInTheDocument();
  });

  it("does not call the API for an empty message", async () => {
    render(<ChatScreen />);
    const send = screen.getByRole("button", { name: /enviar mensagem/i });

    expect(send).toBeDisabled();
    fireEvent.click(send);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the authenticated access token and streams the assistant response", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      streamResponse([
        "data: {\"choices\":[{\"delta\":{\"content\":\"Olá, Roberta!\"}}]}\n",
        "data: {\"choices\":[{\"delta\":{\"content\":\" Vamos começar.\"}}]}\n",
        "data: [DONE]\n",
      ])
    );

    render(<ChatScreen />);
    const input = screen.getByPlaceholderText("Digite sua mensagem...");
    fireEvent.change(input, { target: { value: "Quero descobrir meu propósito" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensagem/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0];
    expect((request as RequestInit).headers).toEqual(expect.objectContaining({
      Authorization: "Bearer session-token",
    }));
    expect(JSON.parse(String((request as RequestInit).body)).messages.at(-1)).toEqual({
      role: "user",
      content: "Quero descobrir meu propósito",
    });

    expect(await screen.findByText("Olá, Roberta! Vamos começar.")).toBeInTheDocument();
  });

  it("trims whitespace before sending", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(streamResponse([
      "data: {\"choices\":[{\"delta\":{\"content\":\"OK\"}}]}\n",
      "data: [DONE]\n",
    ]));

    render(<ChatScreen />);
    fireEvent.change(screen.getByPlaceholderText("Digite sua mensagem..."), {
      target: { value: "   mensagem com espaços   " },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensagem/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).messages.at(-1).content)
      .toBe("mensagem com espaços");
  });

  it("rejects oversized input before making a network request", async () => {
    render(<ChatScreen />);
    const input = screen.getByPlaceholderText("Digite sua mensagem...");
    fireEvent.change(input, { target: { value: "x".repeat(4001) } });

    // maxLength protects normal UI input; invoke the submit path through a programmatic value
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /enviar mensagem/i }));
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows a useful error when the session has expired", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    render(<ChatScreen />);
    fireEvent.change(screen.getByPlaceholderText("Digite sua mensagem..."), { target: { value: "teste" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensagem/i }));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Erro",
      description: expect.stringMatching(/sessão expirou/i),
    })));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("handles non-JSON API errors without crashing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => { throw new Error("not json"); },
    } as Response);

    render(<ChatScreen />);
    fireEvent.change(screen.getByPlaceholderText("Digite sua mensagem..."), { target: { value: "teste" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensagem/i }));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Erro",
      description: "Erro na resposta",
    })));
  });
});
