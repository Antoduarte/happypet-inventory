import { z } from 'zod';

export const serviceSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    description: z.string().optional().nullable(),
    price: z.coerce.number().min(0, 'El precio debe ser positivo'),
    is_active: z.boolean(),
    category_id: z.number().optional().nullable(),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;
