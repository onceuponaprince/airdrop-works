import { describe, expect, it } from "vitest"
import {
  DEFAULT_BACKEND_URL,
  mergeConfirmBackendUrl,
  resolveBackendUrl,
  telegramLoginPollPath,
} from "@/lib/backendUrls"

describe("backendUrls", () => {
  it("defaults to the Docker host-mapped API port", () => {
    expect(DEFAULT_BACKEND_URL).toBe("http://localhost:8001")
    expect(resolveBackendUrl()).toBe("http://localhost:8001")
  })

  it("strips trailing slashes from configured backend URLs", () => {
    expect(resolveBackendUrl("http://localhost:8001/")).toBe("http://localhost:8001")
  })

  it("builds merge confirm backend URL", () => {
    expect(mergeConfirmBackendUrl()).toBe(
      "http://localhost:8001/api/v1/auth/merge/confirm/",
    )
    expect(mergeConfirmBackendUrl("https://api.airdrop.works")).toBe(
      "https://api.airdrop.works/api/v1/auth/merge/confirm/",
    )
  })

  it("builds same-origin telegram poll path", () => {
    expect(telegramLoginPollPath("poll-123")).toBe(
      "/api/v1/auth/telegram/login/poll/?poll_key=poll-123",
    )
    expect(telegramLoginPollPath("a+b/c")).toBe(
      "/api/v1/auth/telegram/login/poll/?poll_key=a%2Bb%2Fc",
    )
  })
})
