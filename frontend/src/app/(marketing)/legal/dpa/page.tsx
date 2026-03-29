export default function DpaPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-24 sm:px-6">
      <div className="space-y-8 rounded-xl border border-border bg-card p-8">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Legal</p>
          <h1 className="text-3xl font-semibold">Data Processing Addendum</h1>
          <p className="text-sm text-muted-foreground">
            This DPA summary is intended for customers using AI(r)Drop and SPORE in a controller/processor relationship.
          </p>
        </div>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">Processing scope</h2>
          <p>AI(r)Drop processes account identity data, contribution content, operational telemetry, and billing metadata solely to provide the contracted service.</p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">Subprocessors</h2>
          <p>Current subprocessors may include infrastructure, analytics, and payment providers such as Stripe. Production operator documentation should maintain the current list.</p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">Security controls</h2>
          <p>Controls include authenticated access, tenant scoping, API key hashing, endpoint throttling, audit logging, and scheduled retention enforcement for audit records.</p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">Data subject requests</h2>
          <p>The product supports authenticated user data export and deletion endpoints to help operators fulfill access and erasure requests.</p>
        </section>
      </div>
    </main>
  );
}
