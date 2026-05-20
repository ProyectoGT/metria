import PageHeader from "@/components/layout/page-header";
import { getConfirmationPasswordStatus } from "@/lib/delete-confirmation-password";
import { requirePageAccess } from "@/lib/access-control/route-guard";
import { createClient } from "@/lib/supabase";
import SecuritySettingsForm from "./security-settings-form";
import ProfileHero from "@/modules/cuenta/components/ProfileHero";
import PersonalInfoCard from "@/modules/cuenta/components/PersonalInfoCard";
import SecurityCard from "@/modules/cuenta/components/SecurityCard";
import PreferencesCard from "@/modules/cuenta/components/PreferencesCard";
import EmailConnectionCard from "@/modules/email/components/EmailConnectionCard";

type UserStatus = "active" | "invited" | "disabled";

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

  const { data: profileExtra } = await supabase
    .from("usuarios")
    .select("estado")
    .eq("id", user.id)
    .maybeSingle();

  const userStatus: UserStatus = (profileExtra?.estado as UserStatus) ?? "active";

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

      <div className="space-y-6">
        <ProfileHero
          authUserId={authUser?.id ?? ""}
          fullName={fullName}
          email={user.email ?? authUser?.email ?? ""}
          rol={user.role}
          avatarUrl={avatarUrl}
          status={userStatus}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <PersonalInfoCard
              initialNombre={fullName}
              email={user.email ?? authUser?.email ?? ""}
              rol={user.role}
              status={userStatus}
            />
            <SecurityCard />
          </div>

          <div className="flex flex-col gap-6">
            <EmailConnectionCard
              email={emailAccount?.email ?? null}
              status={emailAccount?.status ?? "not_connected"}
              lastSyncAt={emailAccount?.last_sync_at ?? null}
              lastError={emailAccount?.last_error ?? null}
            />
            <PreferencesCard />
          </div>
        </div>

        {isAdmin && (
          <SecuritySettingsForm
            canManageConfirmationPassword={user.canManageConfirmationPassword}
            passwordStatus={passwordStatus}
          />
        )}
      </div>
    </>
  );
}
