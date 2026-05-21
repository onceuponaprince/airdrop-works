export type RubricData = {
  id?: string | number
  campaign_id?: string | number
  questId?: string | number
  name: string
  description?: string
  teaching_value_weight: number
  originality_weight: number
  community_impact_weight: number
  created_at?: string
  updated_at?: string
  warning?: string
}

export type CampaignOption = {
  id: string
  title: string
}
