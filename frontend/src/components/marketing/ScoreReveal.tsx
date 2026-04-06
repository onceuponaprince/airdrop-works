"use client"

import { useEffect, useRef } from "react"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip,
} from "recharts"
import { ArcadeCard } from "@/components/themed/ArcadeCard"
import type { TweetScore, AccountAnalysis } from "@/types/api"

interface ScoreRevealProps {
  analysis: AccountAnalysis
  tweets: TweetScore[]
}

/** Animated composite score counter — counts from 0 to the target value. */
function AnimatedScore({ value }: { value: number }) {
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (v) => Math.round(v))
  const displayRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.5,
      ease: "easeOut",
    })
    return controls.stop
  }, [value, motionValue])

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => {
      if (displayRef.current) {
        displayRef.current.textContent = String(v)
      }
    })
    return unsubscribe
  }, [rounded])

  return (
    <span ref={displayRef} className="font-display text-5xl text-primary glow-green tabular">
      0
    </span>
  )
}

export function ScoreReveal({ analysis, tweets }: ScoreRevealProps) {
  const { aggregate } = analysis

  // Radar chart data — the 3 scoring dimensions
  const radarData = [
    { subject: "Teaching", value: aggregate.teachingValue },
    { subject: "Originality", value: aggregate.originality },
    { subject: "Impact", value: aggregate.communityImpact },
  ]

  // Bar chart data — one bar per tweet
  const barData = tweets.map((t, i) => ({
    tweet: i + 1,
    score: t.compositeScore,
  }))

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-4"
    >
      {/* Composite score hero */}
      <ArcadeCard glow className="text-center py-6 space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Your AI Judge Score
        </p>
        <div className="flex items-end justify-center gap-1">
          <AnimatedScore value={aggregate.overallScore} />
          <span className="font-mono text-sm text-muted-foreground mb-1">/100</span>
        </div>
        <p className="font-mono text-xs text-primary">
          {aggregate.genuinePercentage}% genuine · {tweets.length} tweets scored
        </p>
      </ArcadeCard>

      {/* Radar chart — dimension breakdown */}
      <ArcadeCard className="py-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground text-center mb-2">
          Dimension Breakdown
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#1F2937" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "monospace" }}
            />
            <Radar
              dataKey="value"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-2">
          {radarData.map((d) => (
            <div key={d.subject} className="text-center">
              <p className="font-mono text-lg text-primary">{d.value}</p>
              <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
                {d.subject}
              </p>
            </div>
          ))}
        </div>
      </ArcadeCard>

      {/* Bar chart — score per tweet */}
      {barData.length > 0 && (
        <ArcadeCard className="py-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground text-center mb-2">
            Score Per Tweet
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={barData} barSize={barData.length > 15 ? 8 : 12}>
              <XAxis
                dataKey="tweet"
                tick={{ fill: "#374151", fontSize: 8, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{
                  background: "#13141D",
                  border: "1px solid #1F2937",
                  borderRadius: 4,
                  fontFamily: "monospace",
                  fontSize: 11,
                }}
                labelStyle={{ color: "#6B7280" }}
                itemStyle={{ color: "#10B981" }}
                formatter={(value) => [`${value}/100`, "Score"]}
                labelFormatter={(label) => `Tweet ${label}`}
              />
              <Bar
                dataKey="score"
                fill="#10B981"
                opacity={0.8}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ArcadeCard>
      )}

      {/* Strengths / weaknesses */}
      {(aggregate.strengths || aggregate.weaknesses) && (
        <ArcadeCard className="space-y-2 text-xs">
          {aggregate.strengths && (
            <p className="text-foreground">
              <span className="font-mono text-primary">+</span> {aggregate.strengths}
            </p>
          )}
          {aggregate.weaknesses && (
            <p className="text-foreground">
              <span className="font-mono text-destructive">−</span> {aggregate.weaknesses}
            </p>
          )}
        </ArcadeCard>
      )}
    </motion.div>
  )
}
