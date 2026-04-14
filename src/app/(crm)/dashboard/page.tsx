import { getCurrentUserContext } from "@/lib/current-user";
import {
  mockSummary,
  mockListings,
  mockKanban,
  mockAgentOfMonth,
  mockAgents,
} from "@/lib/mock/dashboard";
import SummaryPanel from "@/components/dashboard/SummaryPanel";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import AgentOfMonth from "@/components/dashboard/AgentOfMonth";
import AgentPerformanceTable from "@/components/dashboard/AgentPerformanceTable";
import MyActivity from "@/components/dashboard/MyActivity";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

function formatDateEs() {
  return new Date()
    .toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .replace(/^./, (c) => c.toUpperCase());
}

export default async function DashboardPage() {
  const user = await getCurrentUserContext();

  const role = user?.role ?? "Agente";
  const userName = user?.nombre ?? "Usuario";
  const userId = user?.id?.toString() ?? "0";
  const fullName = user ? `${user.nombre} ${user.apellidos}`.trim() : "Usuario";

  const showAgentPerformance =
    role === "Administrador" || role === "Director" || role === "Responsable";
  const showMyActivity = role === "Agente";

  // Mock: pretend the logged-in agent is the first one in mockAgents
  const ownMetrics = mockAgents[0];

  return (
    <div className="flex flex-col gap-8">
      {/* 1 — Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {getGreeting()}, {userName}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{formatDateEs()}</p>
      </div>

      {/* 2 — Summary panel */}
      <SummaryPanel summary={mockSummary} listings={mockListings} />

      {/* 3 — Kanban board */}
      <section>
        <div className="mb-4">
          <h2 className="font-semibold text-text-primary">Mis tareas</h2>
          <p className="text-sm text-text-secondary">
            Organiza tu trabajo arrastrando las tarjetas entre columnas.
          </p>
        </div>
        <KanbanBoard
          initialData={mockKanban}
          role={role}
          currentUserId={userId}
          agents={mockAgents.map((a) => ({ id: a.id, nombre: a.nombre }))}
        />
      </section>

      {/* 4 — Agent of the month */}
      <AgentOfMonth
        initialData={mockAgentOfMonth}
        role={role}
        currentUserName={fullName}
        agents={mockAgents.map((a) => ({ id: a.id, nombre: a.nombre }))}
      />

      {/* 5 — Performance / My activity (role-conditional) */}
      {showAgentPerformance && <AgentPerformanceTable agents={mockAgents} />}
      {showMyActivity && <MyActivity metrics={ownMetrics} />}
    </div>
  );
}
