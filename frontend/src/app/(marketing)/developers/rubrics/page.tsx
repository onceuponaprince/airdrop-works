import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Open Rubrics — Developer Catalog | AI(r)Drop",
  description:
    "Public rubric specifications for contribution quality and performance marketing scoring.",
}

const BACKEND_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8001"

async function fetchCatalog(): Promise<{
  rubrics: Array<{ key: string; name: string; description: string; specVersion: string }>
  count: number
} | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/judge/rubrics/`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function DevelopersRubricsPage() {
  const catalog = await fetchCatalog()
  const rubrics = catalog?.rubrics ?? []

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Open Rubric v1</p>
        <h1 className="mt-2 font-heading text-3xl font-bold">Rubric catalog</h1>
        <p className="mt-4 text-muted-foreground">
          Machine-readable scoring criteria. Fork with attribution (CC-BY-4.0). Schema:{" "}
          <code className="text-foreground">schemas/rubric/v1/rubric-spec.schema.json</code>
        </p>

        <section className="mt-10 space-y-6">
          {rubrics.length === 0 ? (
            <p className="text-muted-foreground">Catalog unavailable — start the backend API.</p>
          ) : (
            rubrics.map((r) => (
              <article
                key={r.key}
                className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/50"
              >
                <h2 className="font-heading text-xl font-semibold">{r.name}</h2>
                <p className="mt-1 font-mono text-sm text-primary">{r.key}</p>
                <p className="mt-3 text-sm text-muted-foreground">{r.description}</p>
                <pre className="mt-4 overflow-x-auto rounded bg-muted p-3 font-mono text-xs">
                  {`curl -s ${BACKEND_URL}/api/v1/judge/rubrics/${r.key}/`}
                </pre>
              </article>
            ))
          )}
        </section>

        <section className="mt-12 rounded-lg border border-border p-6">
          <h2 className="font-heading text-lg font-semibold">Local evaluation</h2>
          <pre className="mt-3 overflow-x-auto font-mono text-xs text-muted-foreground">
            {`./scripts/score_rubric_local.sh performance_marketing_v1 "Your ad copy"`}
          </pre>
          <p className="mt-4 text-sm text-muted-foreground">
            Governance: <code>docs/RUBRIC_GOVERNANCE.md</code> · Data coop:{" "}
            <code>docs/DATA_COOP_RULES.md</code>
          </p>
        </section>
      </div>
    </main>
  )
}
