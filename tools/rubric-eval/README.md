# rubric-eval

Offline heuristic scorer for [Open Rubric](../../schemas/rubric/v1/) JSON files. Use to validate integrations without Anthropic API keys.

## Usage

```bash
python3 tools/rubric-eval/evaluate.py \
  --rubric schemas/rubric/v1/rubrics/performance_marketing_v1.json \
  --text "Launch week: 50% off Pro. Join 10k builders today."
```

Or via repo script:

```bash
./scripts/score_rubric_local.sh performance_marketing_v1 "Your ad copy here"
```

## Hosted scoring

For production scores, use `POST /api/v1/judge/demo/marketing/` or authenticated `POST /api/v1/judge/score/` — see `/developers/rubrics`.
