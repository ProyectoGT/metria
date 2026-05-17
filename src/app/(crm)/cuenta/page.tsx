import PageHeader from "@/components/layout/page-header";
import { getConfirmationPasswordStatus } from "@/lib/delete-confirmation-password";
import { requirePageAccess } from "@/lib/access-control/route-guard";
import { createClient } from "@/lib/supabase";
import SecuritySettingsForm from "./security-settings-form";
import AccountProfileCard from "@/modules/cuenta/components/AccountProfileCard";
import EmailConnectionCard from "@/modules/email/components/EmailConnectionCard";

export default async function CuentaPage() {
  const supabase = await createClient();

  const [user, passwordStatus, { data: { user: authUser } }] = await Promise.all([
    requirePageAccess("cuenta"),
    getConfirmationPasswordStatus(),
    supabase.auth.getUser(),
  ]);

  const isAdmin = user.role === "Administrador";

  const fullName = `${user.nombre} ${user.apellidos}`.trim();
  const avatarUrl =
    (authUser?.user_metadata?.avatar_url as string | undefined) ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: emailAccount } = await (supabase as any)
    .from("email_accounts")
    .select("email,status,last_sync_at,last_error")
    .eq("user_id", user.id)
    .eq("provider", "gmail")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <>
      <PageHeader
        title="Cuenta"
        description="Perfil actual y seguridad de operaciones sensibles"
      />

      <div
        className={
          isAdmin
            ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
            : "grid gap-6"
        }
      >
        <AccountProfileCard
          authUserId={authUser?.id ?? ""}
          initialNombre={fullName}
          email={user.email ?? authUser?.email ?? ""}
          rol={user.role}
          initialAvatarUrl={avatarUrl}
        />

        <EmailConnectionCard
          email={emailAccount?.email ?? null}
          status={emailAccount?.status ?? "not_connected"}
          lastSyncAt={emailAccount?.last_sync_at ?? null}
          lastError={emailAccount?.last_error ?? null}
        />

        {isAdmin && (
          <SecuritySettingsForm
            currentRole={user.role}
            canManageConfirmationPassword={user.canManageConfirmationPassword}
            passwordStatus={passwordStatus}
          />
        )}
      </div>
    </>
  );
}
