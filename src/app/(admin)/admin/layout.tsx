import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const isAdminEmail = user.email?.toLowerCase() === "admin@carpi.com";

    // Fetch role from profiles
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    const role = (profile?.role as string | undefined) ?? (isAdminEmail ? 'admin_carpi' : undefined);

    if (!role || !['admin_carpi', 'gestor_financiero', 'encargado_ventas'].includes(role)) {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar Fixed */}
            <AdminSidebar role={role} />

            {/* Main Content Wrapper */}
            <div className="flex-1 ml-64 flex flex-col min-h-screen">
                <AdminHeader userEmail={user.email} role={role} />

                <main className="flex-1 p-8 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
