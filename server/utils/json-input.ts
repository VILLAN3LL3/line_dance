import { z } from 'zod';

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export const jsonInput: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.custom<number>((value) => typeof value === 'number'),
    z.string(),
    z.array(jsonInput),
    z.record(z.string(), jsonInput),
  ]),
);
