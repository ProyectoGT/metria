import { getCurrentUserContext } from "@/lib/current-user";
import { canUseFeature } from "./can-access";

export async function requireFeatureAccess(featureKey: string): Promise<void> {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) {
    throw new Error("No autorizado");
  }

  const allowed = await canUseFeature(currentUser, featureKey);
  if (!allowed) {
    throw new Error("Acceso denegado por configuración de control de acceso");
  }
}
