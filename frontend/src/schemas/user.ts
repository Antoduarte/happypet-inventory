import { z } from 'zod';

export const userSchema = z
    .object({
        name: z.string().min(1, 'El nombre es requerido'),
        email: z.string().email('Debe ser un correo electrónico válido'),
        password: z.string().optional().or(z.literal('')),
        password_confirm: z.string().optional().or(z.literal('')),
        role: z.enum(['admin', 'manager', 'cashier']),
        code: z.string().max(6).optional().or(z.literal('')),
        is_active: z.boolean(),
    })
    .refine(
        (data) => {
            if (data.password || data.password_confirm) {
                return data.password === data.password_confirm;
            }
            return true;
        },
        {
            message: 'Las contraseñas no coinciden',
            path: ['password_confirm'],
        },
    );

export type UserFormData = z.infer<typeof userSchema>;
