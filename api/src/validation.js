import { z } from 'zod';

export const noteCreateSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  releaseAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid ISO date'),
  webhookUrl: z.string().url(),
});


