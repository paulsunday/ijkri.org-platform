import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendChatNotification } from "./notify-webhook";

const ORIGINAL_ENV = { ...process.env };

describe("sendChatNotification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("does nothing when DISCORD_WEBHOOK_URL is not configured", async () => {
    delete process.env.DISCORD_WEBHOOK_URL;
    const fetchSpy = vi.spyOn(global, "fetch");

    await sendChatNotification({
      title: "Test",
      message: "Hello",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts a Discord embed payload when configured", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.example/webhook";

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    await sendChatNotification({
      title: "New manuscript submitted",
      message: "IJKRI-2026-001 was submitted.",
      link: "https://ijkri.org/admin/submissions/abc",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://discord.example/webhook");

    const body = JSON.parse(String(init?.body));
    expect(body.embeds[0].title).toBe("New manuscript submitted");
    expect(body.embeds[0].description).toContain(
      "IJKRI-2026-001 was submitted.",
    );
    expect(body.embeds[0].description).toContain(
      "https://ijkri.org/admin/submissions/abc",
    );
  });

  it("never throws when the webhook request fails", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.example/webhook";

    vi.spyOn(global, "fetch").mockRejectedValue(
      new Error("network down"),
    );

    await expect(
      sendChatNotification({ title: "Test", message: "Hello" }),
    ).resolves.toBeUndefined();
  });

  it("never throws when the webhook returns a non-OK status", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.example/webhook";

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    await expect(
      sendChatNotification({ title: "Test", message: "Hello" }),
    ).resolves.toBeUndefined();
  });
});
