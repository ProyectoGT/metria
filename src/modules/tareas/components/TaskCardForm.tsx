"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { KanbanPriority } from "@/lib/mock/dashboard";
import { taskCardFormSchema, type TaskCardFormValues } from "../schemas/task.schema";

type AgentOption = {
  id: string;
  nombre: string;
};

type TaskCardFormProps = {
  formId: string;
  defaultValues: TaskCardFormValues;
  agents: AgentOption[];
  canAssign: boolean;
  submitLabel: string;
  submittingLabel?: string;
  onSubmit: (values: TaskCardFormValues) => void;
  onCancel: () => void;
  backendError?: string | null;
};

const PRIORITIES: Array<{ value: KanbanPriority; label: string; activeCls: string; cls: string }> = [
  { value: "alta", label: "Alta", cls: "text-red-700 hover:bg-red-500/10", activeCls: "border-red-500 bg-red-500/15 text-red-700" },
  { value: "media", label: "Media", cls: "text-yellow-700 hover:bg-yellow-50", activeCls: "border-yellow-500 bg-yellow-100 text-yellow-700" },
  { value: "baja", label: "Baja", cls: "text-gray-600 hover:bg-gray-50", activeCls: "border-gray-400 bg-gray-100 text-gray-700" },
];

export default function TaskCardForm({
  formId,
  defaultValues,
  agents,
  canAssign,
  submitLabel,
  submittingLabel = "Guardando...",
  onSubmit,
  onCancel,
  backendError,
}: TaskCardFormProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    control,
    register,
    setValue,
  } = useForm<TaskCardFormValues>({
    resolver: zodResolver(taskCardFormSchema),
    defaultValues,
  });

  const priority = useWatch({ control, name: "priority" });
  const assignedUserIds = useWatch({ control, name: "assignedUserIds" });
  const firstAssignedUserId = assignedUserIds[0]?.toString() ?? agents[0]?.id ?? "";

  return (
    <>
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5 py-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Titulo <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            {...register("title")}
            placeholder="Titulo de la tarea"
            className="input"
            autoFocus
          />
          {errors.title && <p className="mt-1 text-xs text-danger">{errors.title.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Descripcion</label>
          <textarea
            {...register("description")}
            placeholder="Descripcion opcional..."
            rows={2}
            className="input resize-none"
          />
          {errors.description && <p className="mt-1 text-xs text-danger">{errors.description.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Prioridad</label>
          <div className="flex gap-2">
            {PRIORITIES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setValue("priority", item.value, { shouldDirty: true, shouldValidate: true })}
                className={[
                  "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
                  priority === item.value ? item.activeCls : `border-border ${item.cls}`,
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </div>
          {errors.priority && <p className="mt-1 text-xs text-danger">{errors.priority.message}</p>}
        </div>

        {canAssign && agents.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Asignar a</label>
            <select
              value={firstAssignedUserId}
              onChange={(event) =>
                setValue("assignedUserIds", [Number(event.target.value)], { shouldDirty: true, shouldValidate: true })
              }
              className="input"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.nombre}</option>
              ))}
            </select>
            {errors.assignedUserIds && <p className="mt-1 text-xs text-danger">{errors.assignedUserIds.message}</p>}
          </div>
        )}

        {backendError && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{backendError}</p>
        )}
      </form>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
        >
          Cancelar
        </button>
        <button
          form={formId}
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </>
  );
}
