import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/current-user";
import { canAccessPage } from "./can-access";

export async function requirePageAccess(pageKey: string): Promise<NonNullable<Awaited<ReturnType<typeof getCurrentUserContext>>>> {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) redirect("/login");

  const allowed = await canAccessPage(currentUser, pageKey);
  if (!allowed) redirect("/dashboard");

  return currentUser;
}
