export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-24 sm:px-6">
      <div className="space-y-8 rounded-xl border border-border bg-card p-8">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Legal</p>
          <h1 className="text-3xl font-semibold">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">
            AI(r)Drop stores only the information needed to operate contribution scoring,
            SPORE analytics, billing, and account security.
          </p>
        </div>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">What we collect</h2>
          <p>Wallet address, optional email/profile fields, contribution content, tenant metadata, usage events, and audit logs.</p>
          <p>Billing details are processed by Stripe. We do not store raw card data.</p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">Why we collect it</h2>
          <p>We use this data to authenticate users, score contributions, provide SPORE graph analytics, enforce quotas, and keep an operational audit trail.</p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">Retention</h2>
          <p>
            Audit log retention is controlled operationally via <code>SPORE_AUDIT_RETENTION_DAYS</code>.
            Audit data is purged automatically by a scheduled backend task after the configured retention window.
          </p>
          <p>Other user-linked operational records are retained only as long as needed to provide the service or satisfy contractual requirements.</p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">Your rights</h2>
          <p>You can request a JSON export of your account data and delete your account through authenticated product endpoints.</p>
          <p>Controllers/operators should document customer-specific retention periods in their DPA or order form.</p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">Cookies and local storage</h2>
          <p>Essential browser storage is used for authentication and UI state. Optional analytics scripts run only if you grant analytics consent.</p>
        </section>
      </div>
    </main>
  );
}
