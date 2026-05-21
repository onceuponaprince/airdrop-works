# Data cooperative rules (Phase 4 draft)

**Status:** Policy draft — not a legal agreement. Formal coop structure deferred until Phase 2 pilot data exists.

## Purpose

Aggregate **labelled scoring outcomes** (with consent) to improve farming-pattern detection and rubric calibration without selling raw social content.

## What may be shared (opt-in)

| Data | Default | Use |
|------|---------|-----|
| Dimension scores + `farming_flag` | Opt-in per protocol | Aggregate benchmarks |
| Rubric key + spec version | Always (public) | Reproducibility |
| Raw tweet/post text | **Off** unless explicit consent | Never sold; not required for coop |

## What we do not do

- Resell contributor PII or OAuth tokens.
- Train third-party models on private pilot exports without contract.
- Mix marketing-judge copy with Web3 integrity exports without tenant separation.

## Protocol obligations

- Disclose AI Judge scoring to end users where allocations are affected.
- Honor deletion requests for stored contributions tied to a wallet.
- Use exported CSV/JSON only under campaign agreement.

## Contributor rights

- View scores on their wallet profile.
- Appeal farming flags via support (process matures in Phase 5).

## Next steps

- Pilot MOU template referencing this doc.
- Technical: anonymized aggregate table (Phase 4+ engineering, not in 0.5.0).
