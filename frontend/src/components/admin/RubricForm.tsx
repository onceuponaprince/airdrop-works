"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { ArcadeCard } from "@/components/themed/ArcadeCard"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import type { CampaignOption, RubricData } from "@/types/rubric"

interface Rubric {
  id: string
  name: string
  description: string
  teachingValueWeight: number
  originalityWeight: number
  communityImpactWeight: number
  customInstructions: string
  isDefault: boolean
  weightSum?: number
  questId?: string | null
  campaignId?: string | null
  warning?: string
}

type RubricFormProps = {
  initialCampaignId?: string | null
  onSuccess?: (rubric: RubricData) => void
  onCancel?: () => void
}

interface RubricFormState {
  name: string
  description: string
  teachingValueWeight: string
  originalityWeight: string
  communityImpactWeight: string
  customInstructions: string
  isDefault: boolean
}

const INITIAL_STATE: RubricFormState = {
  name: "",
  description: "",
  teachingValueWeight: "33.3",
  originalityWeight: "33.3",
  communityImpactWeight: "33.4",
  customInstructions: "",
  isDefault: false,
}

function toFormState(rubric: Rubric): RubricFormState {
  return {
    name: rubric.name,
    description: rubric.description ?? "",
    teachingValueWeight: toPercentString(rubric.teachingValueWeight ?? 0.333),
    originalityWeight: toPercentString(rubric.originalityWeight ?? 0.333),
    communityImpactWeight: toPercentString(rubric.communityImpactWeight ?? 0.334),
    customInstructions: rubric.customInstructions ?? "",
    isDefault: rubric.isDefault,
  }
}

function parseWeightPercent(value: string): number {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(100, Math.max(0, parsed)) / 100
}

function toPercentString(weight: number): string {
  return String(Math.round(weight * 1000) / 10)
}

function toRubricData(saved: Rubric, questId: string): RubricData {
  return {
    id: saved.id,
    campaign_id: questId || saved.campaignId || saved.questId || undefined,
    questId: questId || saved.questId || saved.campaignId || undefined,
    name: saved.name,
    description: saved.description,
    teaching_value_weight: saved.teachingValueWeight,
    originality_weight: saved.originalityWeight,
    community_impact_weight: saved.communityImpactWeight,
    warning: saved.warning,
  }
}

export function RubricForm({
  initialCampaignId = null,
  onSuccess,
  onCancel,
}: RubricFormProps = {}) {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string>("")
  const [questId, setQuestId] = useState<string>(initialCampaignId ?? "")
  const [draftForm, setDraftForm] = useState<RubricFormState | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const campaignsQuery = useQuery<{ results: CampaignOption[] } | CampaignOption[]>({
    queryKey: ["admin", "campaigns"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token")
      if (token) api.setToken(token)
      return api.get("/quests/admin/campaigns/")
    },
    retry: false,
  })

  const campaignOptions: CampaignOption[] = Array.isArray(campaignsQuery.data)
    ? campaignsQuery.data
    : (campaignsQuery.data?.results ?? [])

  const rubricsQuery = useQuery<Rubric[]>({
    queryKey: ["admin", "rubrics"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token")
      if (token) api.setToken(token)
      return api.get<Rubric[]>("/judge/rubric/")
    },
    retry: false,
  })

  const selectedRubric = selectedId
    ? rubricsQuery.data?.find((rubric) => rubric.id === selectedId) ?? null
    : rubricsQuery.data?.find((rubric) => rubric.isDefault) ?? rubricsQuery.data?.[0] ?? null

  const form = draftForm ?? (selectedRubric ? toFormState(selectedRubric) : INITIAL_STATE)

  const currentWeightSum = useMemo(
    () =>
      parseWeightPercent(form.teachingValueWeight) +
      parseWeightPercent(form.originalityWeight) +
      parseWeightPercent(form.communityImpactWeight),
    [form.teachingValueWeight, form.originalityWeight, form.communityImpactWeight]
  )

  const nameValid = form.name.trim().length >= 3 && form.name.trim().length <= 100

  const saveMutation = useMutation<Rubric, Error, void>({
    mutationFn: async () => {
      if (!nameValid) {
        throw new Error("Campaign name must be between 3 and 100 characters.")
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        questId: questId || undefined,
        teachingValueWeight: parseWeightPercent(form.teachingValueWeight),
        originalityWeight: parseWeightPercent(form.originalityWeight),
        communityImpactWeight: parseWeightPercent(form.communityImpactWeight),
        customInstructions: form.customInstructions.trim(),
        isDefault: form.isDefault,
      }

      const token = localStorage.getItem("auth_token")
      if (token) api.setToken(token)

      if (selectedId) {
        return api.put<Rubric>(`/judge/rubric/${selectedId}/`, payload)
      }

      return api.post<Rubric>("/judge/rubric/", payload)
    },
    onSuccess: async (savedRubric) => {
      setMessage(`Saved ${savedRubric.name}`)
      setError(null)
      setSelectedId(savedRubric.id)
      setDraftForm(toFormState(savedRubric))
      await queryClient.invalidateQueries({ queryKey: ["admin", "rubrics"] })
      onSuccess?.(toRubricData(savedRubric, questId))
    },
    onError: (err: Error) => {
      setMessage(null)
      setError(err.message || "Failed to save rubric")
    },
  })

  return (
    <ArcadeCard className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[--muted-foreground]">Campaign Rubric</p>
          <h2 className="mt-1 font-display text-xl text-[--primary]">Score configuration</h2>
        </div>
        {rubricsQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-[--muted-foreground]" /> : null}
      </div>

      <label className="block space-y-2 text-sm">
        <span className="text-[--muted-foreground]">Campaign</span>
        <select
          value={questId}
          onChange={(event) => setQuestId(event.target.value)}
          className="h-11 w-full rounded-[var(--radius)] border border-input bg-transparent px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">No campaign linked</option>
          {campaignOptions.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.title}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2 text-sm">
        <span className="text-[--muted-foreground]">Load existing rubric</span>
        <select
          value={selectedId}
          onChange={(event) => {
            const nextId = event.target.value
            setSelectedId(nextId)
            const nextRubric = rubricsQuery.data?.find((rubric) => rubric.id === nextId)
            if (nextRubric) {
              setDraftForm(toFormState(nextRubric))
            } else {
              setDraftForm(null)
            }
            setMessage(null)
            setError(null)
          }}
          className="h-11 w-full rounded-[var(--radius)] border border-input bg-transparent px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Create new rubric</option>
          {rubricsQuery.data?.map((rubric) => (
            <option key={rubric.id} value={rubric.id}>
              {rubric.name}{rubric.isDefault ? " (default)" : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2 text-sm md:col-span-2">
          <span className="text-[--muted-foreground]">Name</span>
          <Input
            value={form.name}
            onChange={(event) => setDraftForm((prev) => ({ ...(prev ?? form), name: event.target.value }))}
            placeholder="Creator Quality Rubric"
          />
        </label>

        <label className="block space-y-2 text-sm md:col-span-2">
          <span className="text-[--muted-foreground]">Description</span>
          <textarea
            value={form.description}
            onChange={(event) => setDraftForm((prev) => ({ ...(prev ?? form), description: event.target.value }))}
            placeholder="Explain when to use this rubric."
            className="min-h-24 w-full rounded-[var(--radius)] border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="text-[--muted-foreground]">Teaching value (%)</span>
          <Input
            type="number"
            step="1"
            min="0"
            max="100"
            value={form.teachingValueWeight}
            onChange={(event) => setDraftForm((prev) => ({ ...(prev ?? form), teachingValueWeight: event.target.value }))}
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-[--muted-foreground]">Originality (%)</span>
          <Input
            type="number"
            step="1"
            min="0"
            max="100"
            value={form.originalityWeight}
            onChange={(event) => setDraftForm((prev) => ({ ...(prev ?? form), originalityWeight: event.target.value }))}
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-[--muted-foreground]">Community impact (%)</span>
          <Input
            type="number"
            step="1"
            min="0"
            max="100"
            value={form.communityImpactWeight}
            onChange={(event) => setDraftForm((prev) => ({ ...(prev ?? form), communityImpactWeight: event.target.value }))}
          />
        </label>
        <label className="flex items-center gap-3 rounded-[var(--radius)] border border-input px-3 py-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(event) => setDraftForm((prev) => ({ ...(prev ?? form), isDefault: event.target.checked }))}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-[--muted-foreground]">Mark as default rubric</span>
        </label>

        <label className="block space-y-2 text-sm md:col-span-2">
          <span className="text-[--muted-foreground]">Custom instructions</span>
          <textarea
            value={form.customInstructions}
            onChange={(event) => setDraftForm((prev) => ({ ...(prev ?? form), customInstructions: event.target.value }))}
            placeholder="Extra scoring instructions for the judge."
            className="min-h-28 w-full rounded-[var(--radius)] border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-[--muted-foreground]">Weight sum:</span>
        <span className={currentWeightSum > 1.01 || currentWeightSum < 0.99 ? "text-[--destructive]" : "text-[--primary]"}>
          {(currentWeightSum * 100).toFixed(1)}%
        </span>
        <span className="text-[--muted-foreground]">(target 100%)</span>
      </div>

      {message ? <p className="text-sm text-[--primary]">{message}</p> : null}
      {error ? <p className="text-sm text-[--destructive]">{error}</p> : null}
      {rubricsQuery.isError ? <p className="text-sm text-[--destructive]">Unable to load rubrics.</p> : null}

      <div className="flex flex-wrap gap-3">
        <ArcadeButton
          onClick={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          disabled={!nameValid}
        >
          {selectedId ? "Update rubric" : "Create rubric"}
        </ArcadeButton>
        <ArcadeButton
          type="button"
          variant="secondary"
          onClick={() => {
            setSelectedId("")
            setDraftForm(null)
            setMessage(null)
            setError(null)
          }}
        >
          New rubric
        </ArcadeButton>
        {onCancel ? (
          <ArcadeButton type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </ArcadeButton>
        ) : null}
      </div>
    </ArcadeCard>
  )
}