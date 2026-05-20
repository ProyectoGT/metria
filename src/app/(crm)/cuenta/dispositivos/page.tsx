import { headers } from "next/headers";
import PageHeader from "@/components/layout/page-header";
import { requirePageAccess } from "@/lib/access-control/route-guard";
import { getMyDevices } from "@/modules/security/devices/queries";
import UserDevicesPage from "@/modules/security/devices/components/UserDevicesPage";

export const dynamic = "force-dynamic";

export default async function MisDispositivosPage() {
  const user = await requirePageAccess("cuenta");
  const requestHeaders = await headers();
  const devices = await getMyDevices(user, requestHeaders);

  return (
    <>
      <PageHeader
        title="Cuenta"
        description="Perfil, seguridad y dispositivos vinculados"
        back={{ href: "/cuenta", label: "Cuenta" }}
      />

      <UserDevicesPage devices={devices} />
    </>
  );
}

