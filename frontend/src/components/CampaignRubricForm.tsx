"use client"

import { RubricForm } from "@/components/admin/RubricForm"
import type { RubricData } from "@/types/rubric"

export type CampaignRubricFormProps = {
  campaignId?: string | null
  onSuccess: (rubric: RubricData) => void
  onCancel: () => void
}

/**
 * Phase 1 spec wrapper around the admin rubric editor.
 * Delegates to RubricForm with campaign binding and callbacks.
 */
export function CampaignRubricForm({
  campaignId = null,
  onSuccess,
  onCancel,
}: CampaignRubricFormProps) {
  return (
    <RubricForm
      initialCampaignId={campaignId}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  )
}
