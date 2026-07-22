import { z } from 'zod';

export const movementSchema = z.object({
    product_id: z.coerce
        .number({ message: 'El producto es requerido' })
        .positive('El producto es requerido'),
    movement_type: z.enum(['in', 'out']),
    quantity: z.coerce.number().min(0.0001, 'La cantidad debe ser mayor a 0'),
    presentation_id: z.coerce.number().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export type MovementFormData = z.infer<typeof movementSchema>;
