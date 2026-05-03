import PageHeader from "@/components/layout/page-header";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";
import EmailInboxClient from "./email-inbox-client";

export default async function EmailPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return null;

  const supabase = await createClient();
  const [{ data: accounts }, { data: messages }, { data: links }, { data: templates }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("email_accounts")
      .select("id,email,status,last_sync_at,last_error")
      .eq("user_id", currentUser.id)
      .order("updated_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("email_messages")
      .select("id,account_id,provider_thread_id,from_email,from_name,to_emails,subject,snippet,body_text,received_at,sent_at,is_read,has_attachments,direction,folder")
      .eq("user_id", currentUser.id)
      .is("archived_at", null)
      .order("received_at", { ascending: false, nullsFirst: false })
      .order("sent_at", { ascending: false, nullsFirst: false })
      .limit(100),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("email_entity_links")
      .select("id,email_message_id,entity_type,entity_id,confidence_score,linked_by"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("email_templates")
      .select("id,name,subject,body_text,category")
      .order("category"),
  ]);

  return (
    <>
      <PageHeader
        title="Email"
        description="Bandeja de correo, hilos y comunicaciones vinculadas al CRM"
      />
      <EmailInboxClient
        accounts={accounts ?? []}
        messages={messages ?? []}
        links={links ?? []}
        templates={templates ?? []}
      />
    </>
  );
}
