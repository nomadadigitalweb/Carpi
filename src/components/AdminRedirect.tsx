"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function AdminRedirect() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        console.log("AdminRedirect checking...", { isLoaded, user: user?.id, pathname });
        if (isLoaded && user && pathname === "/") {
            const role = user.publicMetadata.role as string;
            console.log("User role found:", role);
            if (role === 'admin' || role === 'gerente' || role === 'logistica') {
                console.log("Redirecting to /admin...");
                router.push('/admin');
            } else {
                console.log("Role not authorized for auto-redirect.");
            }
        }
    }, [isLoaded, user, pathname, router]);

    return null;
}
