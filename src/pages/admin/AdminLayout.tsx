import { NavLink, Outlet } from "react-router-dom";
import { RequireAdmin } from "../../components/auth/RequireAdmin.tsx";

const navLinks = [
    { to: "/admin/drafts", label: "Drafts" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/analytics", label: "Analytics" },
];

function AdminSidebar() {
    return (
        <aside className="w-48 shrink-0 border-r border-border pr-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-4">
                Admin
            </p>
            <nav className="flex flex-col gap-1">
                {navLinks.map(({ to, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            [
                                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-accent text-accent-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                            ].join(" ")
                        }
                    >
                        {label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}

export default function AdminLayout() {
    return (
        <RequireAdmin>
            <div className="max-w-[960px] mx-auto py-16 px-4 animate-in fade-in">
                <div className="flex gap-10">
                    <AdminSidebar />
                    <main className="flex-1 min-w-0">
                        <Outlet />
                    </main>
                </div>
            </div>
        </RequireAdmin>
    );
}
