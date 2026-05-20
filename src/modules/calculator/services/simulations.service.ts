import type { CalculatorSimulation, CalculatorSimulationType, SimulationContext } from "../types";

export type SaveSimulationInput = {
  type: CalculatorSimulationType;
  title: string;
  inputData: Record<string, unknown>;
  resultData: Record<string, unknown>;
  summary: string;
  context?: SimulationContext;
};

export async function listCalculatorSimulations(): Promise<CalculatorSimulation[]> {
  return [];
}

export async function saveCalculatorSimulation(_input: SaveSimulationInput): Promise<CalculatorSimulation | null> {
  void _input;
  return null;
}

export async function duplicateCalculatorSimulation(_id: string): Promise<CalculatorSimulation | null> {
  void _id;
  return null;
}

export async function deleteCalculatorSimulation(_id: string): Promise<{ ok: boolean }> {
  void _id;
  return { ok: false };
}
