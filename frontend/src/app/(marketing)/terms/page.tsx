export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-24 sm:px-6">
      <div className="space-y-8 rounded-xl border border-border bg-card p-8">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Legal</p>
          <h1 className="text-3xl font-semibold">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">
            These terms govern access to AI(r)Drop, SPORE analytics, and related managed services.
          </p>
        </div>

        <section className="space-y-2 text-sm text-muted-foreground">
          <p>Customers are responsible for lawful use of the service, the content they ingest, and the credentials issued to their operators.</p>
          <p>AI(r)Drop may suspend access for abuse, fraud, or violations of contract or applicable law.</p>
          <p>Service levels, data retention, and processing instructions should be defined in your commercial agreement and DPA.</p>
        </section>
      </div>
    </main>
  );
}
