"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { contactsService, type ContactRow } from "@/modules/contactos/services/contacts.service";
import type { ContactsListFilters } from "@/lib/query-keys";

type ContactosParams = ContactsListFilters & {
  agentId?: number | null;
};

interface UseContactosOptions {
  params: ContactosParams;
  initialData?: ContactRow[];
}

function toContactFilters(params: ContactosParams): ContactsListFilters {
  return {
    empresaId: params.empresaId,
    search: params.search,
    tipo: params.tipo,
    ownerUserId: params.ownerUserId ?? params.agentId,
  };
}

export function useContactos({ params, initialData }: UseContactosOptions) {
  const filters = toContactFilters(params);

  return useQuery({
    queryKey: queryKeys.contacts.list(filters),
    queryFn: () => contactsService.list(filters),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });
}
