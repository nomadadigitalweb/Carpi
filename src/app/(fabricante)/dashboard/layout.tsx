import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import FabricanteSidebar from "@/components/fabricante/FabricanteSidebar";

export default async function FabricanteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const isAdminEmail = user.email?.toLowerCase() === "admin@carpi.com";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as string | undefined) ?? (isAdminEmail ? "admin_carpi" : undefined);

  if (role !== "fabricante" && role !== "admin_carpi") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <FabricanteSidebar />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
