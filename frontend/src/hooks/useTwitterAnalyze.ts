"use client"

import { useState, useCallback } from "react"
import type { TweetScore, AccountAnalysis } from "@/types/api"
import { useNotificationStore } from "@/stores/useNotificationStore"

interface AnalyzeState {
  status: "idle" | "fetching" | "scoring" | "complete" | "error"
  analysis: AccountAnalysis | null
  tweetScores: TweetScore[]
  tweetsFetched: number
  username: string
  displayName: string
  avatarUrl: string | undefined
  error: string | null
  statusMessage: string | null
}

const INITIAL_STATE: AnalyzeState = {
  status: "idle",
  analysis: null,
  tweetScores: [],
  tweetsFetched: 0,
  username: "",
  displayName: "",
  avatarUrl: undefined,
  error: null,
  statusMessage: null,
}

export function useTwitterAnalyze() {
  const notify = useNotificationStore((s) => s.push)
  const [state, setState] = useState<AnalyzeState>(INITIAL_STATE)

  const analyze = useCallback(async (username: string) => {
    setState({
      ...INITIAL_STATE,
      status: "fetching",
      username,
      statusMessage: `Looking up @${username}…`,
    })

    try {
      const res = await fetch("/api/twitter-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Analysis failed (${res.status})`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("Stream unavailable")

      const decoder = new TextDecoder()
      let buffer = ""
      const collectedScores: TweetScore[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let newLineIdx = buffer.indexOf("\n")
        while (newLineIdx !== -1) {
          const line = buffer.slice(0, newLineIdx).trim()
          buffer = buffer.slice(newLineIdx + 1)

          if (line) {
            const msg = JSON.parse(line)

            switch (msg.type) {
              case "tweets_fetched":
                setState((prev) => ({
                  ...prev,
                  status: "fetching",
                  tweetsFetched: msg.count,
                  username: msg.username,
                  displayName: msg.displayName || msg.username,
                  avatarUrl: msg.avatarUrl,
                  statusMessage: `Found ${msg.count} tweets from @${msg.username}`,
                }))
                break

              case "status":
                setState((prev) => ({
                  ...prev,
                  status: msg.phase === "scoring" ? "scoring" : prev.status,
                  statusMessage: msg.message || null,
                }))
                break

              case "tweet_score": {
                const score: TweetScore = {
                  index: msg.index,
                  tweetId: msg.tweetId,
                  text: msg.text,
                  url: msg.url,
                  teachingValue: msg.score.teachingValue,
                  originality: msg.score.originality,
                  communityImpact: msg.score.communityImpact,
                  compositeScore: msg.score.compositeScore,
                  farmingFlag: msg.score.farmingFlag,
                  oneLiner: msg.score.oneLiner,
                }
                collectedScores.push(score)
                setState((prev) => ({
                  ...prev,
                  tweetScores: [...collectedScores],
                }))
                break
              }

              case "final":
                setState((prev) => ({
                  ...prev,
                  status: "complete",
                  analysis: msg.analysis,
                  tweetScores: msg.analysis.tweets,
                  statusMessage: null,
                }))
                notify({
                  type: "success",
                  title: "Account analysis complete",
                  message: `@${msg.analysis.username}: ${msg.analysis.aggregate.overallScore}/100`,
                })
                break

              case "error":
                throw new Error(msg.message)
            }
          }

          newLineIdx = buffer.indexOf("\n")
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed. Please try again."
      setState((prev) => ({
        ...prev,
        status: "error",
        error: message,
        statusMessage: null,
      }))
      notify({ type: "error", title: "Account analysis failed", message })
    }
  }, [notify])

  const reset = useCallback(() => setState(INITIAL_STATE), [])

  return { ...state, analyze, reset }
}
