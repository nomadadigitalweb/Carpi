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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "fabricante") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <FabricanteSidebar />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
