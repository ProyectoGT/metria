import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import type { z } from "zod";

export function calculatorResolver<TValues extends Record<string, unknown>>(schema: z.ZodType<TValues>): Resolver<TValues> {
  return zodResolver(schema as never) as unknown as Resolver<TValues>;
}
