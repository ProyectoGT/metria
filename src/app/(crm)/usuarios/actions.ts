"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserContext } from "@/lib/current-user";
import { canManageUsers, USER_ROLES, type UserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase-admin";

type CreateUserInput = {
  nombre: string;
  apellidos: string;
  correo: string;
  puesto: string;
  rol: string;
  password: string;
  confirmPassword: string;
};

type ActionResult = {
  success?: boolean;
  error?: string;
  message?: string;
  role?: UserRole;
  status?: string;
  removed?: boolean;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

function mapAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("already been registered") ||
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("duplicate")
  ) {
    return "Ya existe una cuenta de acceso con este correo.";
  }

  if (normalized.includes("password")) {
    return "La contrasena no cumple los requisitos de seguridad de Supabase.";
  }

  if (
    normalized.includes("database error creating new user") ||
    normalized.includes("unexpected_failure")
  ) {
    return "Supabase Auth no ha podido crear el usuario. Revisa si existe un trigger en auth.users que necesite nombre, apellidos o mas campos obligatorios.";
  }

  return message;
}

function mapDeleteError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("violates foreign key constraint") ||
    normalized.includes("foreign key")
  ) {
    return "El usuario tiene datos relacionados en el CRM. Se desactivara su acceso, pero no se eliminara el perfil historico.";
  }

  return message;
}

async function getManagedUserTarget(
  userId: number,
  currentUser: NonNullable<Awaited<ReturnType<typeof getCurrentUserContext>>>
) {
  const adminClient = createAdminClient();
  const target = await adminClient
    .from("usuarios")
    .select("id, nombre, apellidos, correo, rol, puesto, estado, auth_id, empresa_id")
    .eq("id", userId)
    .maybeSingle();

  if (target.error) {
    return { error: target.error.message };
  }

  if (!target.data) {
    return { error: "No se ha encontrado el usuario indicado." };
  }

  if (
    currentUser.empresaId !== null &&
    target.data.empresa_id !== currentUser.empresaId
  ) {
    return { error: "No puedes gestionar usuarios de otra empresa." };
  }

  return { data: target.data };
}

export async function createCrmUserAction(
  input: CreateUserInput
): Promise<ActionResult> {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    return { error: "Tu sesion no es valida. Vuelve a iniciar sesion." };
  }

  if (!canManageUsers(currentUser.role)) {
    return { error: "Solo un Administrador puede crear usuarios." };
  }

  const nombre = input.nombre.trim();
  const apellidos = input.apellidos.trim();
  const correo = input.correo.trim().toLowerCase();
  const rol = input.rol.trim();
  const puesto = input.puesto.trim() || rol;
  const password = input.password;
  const confirmPassword = input.confirmPassword;

  if (!nombre || !apellidos) {
    return { error: "Debes indicar nombre y apellidos." };
  }

  if (!correo || !isValidEmail(correo)) {
    return { error: "Debes indicar un correo valido." };
  }

  if (!isUserRole(rol)) {
    return { error: "El rol indicado no es valido." };
  }

  if (password.length < 8) {
    return { error: "La contrasena debe tener al menos 8 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "La confirmacion de la contrasena no coincide." };
  }

  const adminClient = createAdminClient();
  const existingProfile = await adminClient
    .from("usuarios")
    .select("id, auth_id")
    .eq("correo", correo)
    .maybeSingle();

  if (existingProfile.error) {
    return { error: existingProfile.error.message };
  }

  if (existingProfile.data?.auth_id) {
    return {
      error: "Ya existe un perfil de usuario vinculado con este correo.",
    };
  }

  if (existingProfile.data?.id) {
    return {
      error:
        "Ya existe un perfil manual con este correo. Para evitar duplicados, elimina o actualiza primero ese perfil antes de crear la cuenta de acceso.",
    };
  }

  const authResponse = await adminClient.auth.admin.createUser({
    email: correo,
    password,
    email_confirm: true,
    user_metadata: {
      nombre,
      apellidos,
      puesto,
      rol,
    },
  });

  if (authResponse.error || !authResponse.data.user) {
    return {
      error: mapAuthError(
        authResponse.error?.message ?? "No se pudo crear la cuenta de acceso."
      ),
    };
  }

  const authUserId = authResponse.data.user.id;
  const profilePayload = {
    nombre,
    apellidos,
    puesto,
    rol,
    correo,
    auth_id: authUserId,
    empresa_id: currentUser.empresaId ?? 1,
    equipo_id: currentUser.equipoId ?? 1,
    estado: "active",
  };

  const createdProfile = await adminClient
    .from("usuarios")
    .select("id")
    .eq("auth_id", authUserId)
    .maybeSingle();

  if (createdProfile.error) {
    await adminClient.auth.admin.deleteUser(authUserId);
    return {
      error:
        createdProfile.error.message ??
        "No se pudo localizar el perfil creado para el usuario.",
    };
  }

  const profileResponse = createdProfile.data?.id
    ? await adminClient
        .from("usuarios")
        .update(profilePayload)
        .eq("id", createdProfile.data.id)
    : await adminClient.from("usuarios").insert(profilePayload);

  if (profileResponse.error) {
    await adminClient.auth.admin.deleteUser(authUserId);
    return {
      error:
        profileResponse.error.message ??
        "No se pudo crear el perfil del usuario.",
    };
  }

  revalidatePath("/usuarios");

  return {
    success: true,
    message:
      "Usuario creado correctamente. Ya puede acceder con el correo y la contrasena indicados.",
  };
}

export async function updateUserRoleAction(input: {
  userId: number;
  rol: string;
}): Promise<ActionResult> {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    return { error: "Tu sesion no es valida. Vuelve a iniciar sesion." };
  }

  if (!canManageUsers(currentUser.role)) {
    return { error: "Solo un Administrador puede editar rangos." };
  }

  if (!isUserRole(input.rol)) {
    return { error: "El rol indicado no es valido." };
  }

  if (input.userId === currentUser.id) {
    return { error: "No puedes modificar tu propio rango desde este panel." };
  }

  const targetResult = await getManagedUserTarget(input.userId, currentUser);

  if (targetResult.error || !targetResult.data) {
    return { error: targetResult.error ?? "No se pudo cargar el usuario." };
  }

  if (targetResult.data.rol === "Administrador") {
    return {
      error: "Los usuarios con rango Administrador solo se pueden listar desde este panel.",
    };
  }

  const adminClient = createAdminClient();
  const nextRole = input.rol as UserRole;
  const updateResult = await adminClient
    .from("usuarios")
    .update({
      rol: nextRole,
      puesto: nextRole,
    })
    .eq("id", input.userId);

  if (updateResult.error) {
    return {
      error: updateResult.error.message ?? "No se pudo actualizar el rango.",
    };
  }

  revalidatePath("/usuarios");

  return {
    success: true,
    message: "Rango actualizado correctamente.",
    role: nextRole,
  };
}

export async function deleteUserAction(input: {
  userId: number;
}): Promise<ActionResult> {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    return { error: "Tu sesion no es valida. Vuelve a iniciar sesion." };
  }

  if (!canManageUsers(currentUser.role)) {
    return { error: "Solo un Administrador puede eliminar usuarios." };
  }

  const targetResult = await getManagedUserTarget(input.userId, currentUser);

  if (targetResult.error || !targetResult.data) {
    return { error: targetResult.error ?? "No se pudo cargar el usuario." };
  }

  const target = targetResult.data;

  if (target.rol === "Administrador") {
    return { error: "No se pueden eliminar usuarios con rango Administrador." };
  }

  const adminClient = createAdminClient();

  if (target.auth_id) {
    const authDelete = await adminClient.auth.admin.deleteUser(target.auth_id);
    const authDeleteMessage = authDelete.error?.message?.toLowerCase() ?? "";

    if (
      authDelete.error &&
      !authDeleteMessage.includes("not found") &&
      !authDeleteMessage.includes("user not found")
    ) {
      return {
        error:
          authDelete.error.message ??
          "No se pudo eliminar la cuenta de acceso del usuario.",
      };
    }
  }

  const deleteProfile = await adminClient
    .from("usuarios")
    .delete()
    .eq("id", target.id);

  if (!deleteProfile.error) {
    revalidatePath("/usuarios");
    return {
      success: true,
      message: "Usuario eliminado correctamente.",
      removed: true,
    };
  }

  const disableProfile = await adminClient
    .from("usuarios")
    .update({
      auth_id: null,
      estado: "disabled",
    })
    .eq("id", target.id);

  if (disableProfile.error) {
    return {
      error:
        deleteProfile.error.message ??
        disableProfile.error.message ??
        "No se pudo eliminar ni desactivar el usuario.",
    };
  }

  revalidatePath("/usuarios");

  return {
    success: true,
    message: mapDeleteError(deleteProfile.error.message),
    status: "disabled",
    removed: false,
  };
}
