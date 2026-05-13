import { queryKeys, type ContactsListFilters } from "@/lib/query-keys";

export const contactKeys = {
  all: queryKeys.contacts.all,
  list: (filters: ContactsListFilters) => queryKeys.contacts.list(filters),
  detail: queryKeys.contacts.detail,
};
