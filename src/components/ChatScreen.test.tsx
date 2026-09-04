import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import ChatScreen from "./ChatScreen";

const mockGetSession = vi.fn();
const mockToast = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: mockGetSession }, from: mockFrom, rpc: mockRpc },
}));

const makeChain = (result: unknown) => {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "limit"]) chain[method] = vi.fn(() => chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
};

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
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "session-token" } } });
    mockRpc.mockResolvedValue({ data: 8, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: { streak_days: 7 }, error: null });
      if (table === "conversations") return makeChain({ data: { id: "conversation-1" }, error: null });
      if (table === "messages") return makeChain({
        data: table ? [{ id: "message-1", role: "assistant", content: "Histórico" }] : [],
        error: null,
      });
      return makeChain({ data: null, error: null });
    });
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("loads a persisted conversation and user streak", async () => {
    render(<ChatScreen />);
    expect(await screen.findByText("Histórico")).toBeInTheDocument();
    expect(await screen.findByText("7 dias")).toBeInTheDocument();
  });

  it("does not call the API for an empty message", async () => {
    render(<ChatScreen />);
    const send = screen.getByRole("button", { name: /enviar mensagem/i });
    expect(send).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("persists the user message, authenticates the AI request and persists the response", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(streamResponse([
      "data: {\"choices\":[{\"delta\":{\"content\":\"Olá!\"}}]}\n",
      "data: {\"choices\":[{\"delta\":{\"content\":\" Vamos começar.\"}}]}\n",
      "data: [DONE]\n",
    ]));

    render(<ChatScreen />);
    const input = screen.getByPlaceholderText("Digite sua mensagem...");
    fireEvent.change(input, { target: { value: "Quero descobrir meu propósito" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensagem/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0];
    expect((request as RequestInit).headers).toEqual(expect.objectContaining({ Authorization: "Bearer session-token" }));
    expect(JSON.parse(String((request as RequestInit).body)).conversation_id).toBe("conversation-1");
    expect(await screen.findByText("Olá! Vamos começar.")).toBeInTheDocument();
    expect(mockRpc).toHaveBeenCalledWith("record_compass_activity");
  });

  it("trims whitespace before sending", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(streamResponse([
      "data: {\"choices\":[{\"delta\":{\"content\":\"OK\"}}]}\n",
      "data: [DONE]\n",
    ]));
    render(<ChatScreen />);
    fireEvent.change(screen.getByPlaceholderText("Digite sua mensagem..."), { target: { value: "   mensagem com espaços   " } });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensagem/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)).messages.at(-1).content).toBe("mensagem com espaços");
  });

  it("shows a useful error when the session has expired", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    render(<ChatScreen />);
    fireEvent.change(screen.getByPlaceholderText("Digite sua mensagem..."), { target: { value: "teste" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensagem/i }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Erro", description: expect.stringMatching(/sessão expirou/i) })));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("handles non-JSON API errors without crashing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 503, json: async () => { throw new Error("not json"); } } as Response);
    render(<ChatScreen />);
    fireEvent.change(screen.getByPlaceholderText("Digite sua mensagem..."), { target: { value: "teste" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensagem/i }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Erro", description: "Erro na resposta" })));
  });
});
