export default function AdminUsers() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Users</h1>
                <p className="text-sm text-muted-foreground">
                    User management is handled in the Clerk dashboard.
                </p>
            </div>

            <a
                href="https://dashboard.clerk.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
                Open Clerk Dashboard ↗
            </a>

            <div className="rounded-xl border border-border p-5 space-y-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">How to manage members</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Invite users from <strong>Users → Invite</strong> in the Clerk dashboard.</li>
                    <li>To grant admin access, open the user, go to <strong>Public metadata</strong>, and set <code className="font-mono text-xs">{"{ \"role\": \"admin\" }"}</code>.</li>
                    <li>Members without the <code className="font-mono text-xs">admin</code> role can read members-only posts but cannot access the admin area.</li>
                </ul>
            </div>
        </div>
    );
}
