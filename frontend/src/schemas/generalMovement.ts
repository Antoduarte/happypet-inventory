import { z } from 'zod';

export const generalMovementSchema = z.object({
    type: z.enum(['income', 'expense'], {
        message: 'El tipo es requerido',
    }),
    name: z.string().min(1, 'El nombre es requerido').max(150, 'Máximo 150 caracteres'),
    description: z.string().max(500, 'Máximo 500 caracteres').optional().nullable(),
    amount: z.string().min(1, 'El monto es requerido'),
    date: z.string().min(1, 'La fecha es requerida'),
    payment_method: z.enum(['cash', 'card', 'transfer'], {
        message: 'El método de pago es requerido',
    }),
});

export type GeneralMovementFormData = z.infer<typeof generalMovementSchema>;
