import PageHeader from "@/components/layout/page-header";
import { requirePageAccess } from "@/lib/access-control/route-guard";
import { createClient } from "@/lib/supabase";
import EmailInboxClient from "./email-inbox-client";

export default async function EmailPage() {
  const currentUser = await requirePageAccess("email");

  const supabase = await createClient();
  const [{ data: accounts }, { data: messages }, { data: links }, { data: templates }, { data: alerts }, { data: attachments }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("email_accounts")
      .select("id,email,status,last_sync_at,last_error")
      .eq("user_id", currentUser.id)
      .order("updated_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("email_messages")
      .select("id,account_id,provider_thread_id,from_email,from_name,to_emails,subject,snippet,received_at,sent_at,is_read,has_attachments,direction,folder,commercial_priority,commercial_bucket,intent,urgency,needs_response,response_due_at,responded_at,portal_source")
      .eq("user_id", currentUser.id)
      .is("archived_at", null)
      .order("commercial_priority", { ascending: false })
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("email_alerts")
      .select("id,email_message_id,alert_type,title,severity,due_at,status")
      .eq("user_id", currentUser.id)
      .eq("status", "open")
      .order("due_at", { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("email_attachments")
      .select("id,email_message_id,filename,mime_type,document_type,storage_path")
      .eq("user_id", currentUser.id),
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
        alerts={alerts ?? []}
        attachments={attachments ?? []}
      />
    </>
  );
}
