import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { Service } from './useServices';

const serviceSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    description: z.string().min(5, 'La descripción debe ser más clara'),
    durationMinutes: z.coerce.number().min(5, 'La duración debe ser al menos de 5 minutos'),
    price: z.coerce.number().min(0, 'El precio debe ser positivo'),
    status: z.enum(['active', 'inactive']),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ServiceFormData) => void;
    initialData?: Service | null;
}

export const ServiceFormModal: React.FC<ServiceFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
}) => {
    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<ServiceFormData>({
        resolver: zodResolver(serviceSchema) as any,
        defaultValues: {
            name: '',
            description: '',
            durationMinutes: 30,
            price: 0,
            status: 'active',
        },
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset({ ...initialData });
            } else {
                reset({
                    name: '',
                    description: '',
                    durationMinutes: 30,
                    price: 0,
                    status: 'active',
                });
            }
        }
    }, [isOpen, initialData, reset]);

    const handleFormSubmit = (data: ServiceFormData) => {
        onSubmit(data);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? 'Editar Servicio' : 'Nuevo Servicio'}
            width="md"
        >
            <form onSubmit={handleSubmit(handleFormSubmit as any)} className="space-y-4">
                <Input
                    label="Nombre del Servicio *"
                    placeholder="ej. Aseo Básico"
                    {...register('name')}
                    error={errors.name?.message}
                />

                <Input
                    label="Descripción *"
                    placeholder="Detalles sobre este servicio..."
                    {...register('description')}
                    error={errors.description?.message}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Duración (Minutos) *"
                        type="number"
                        {...register('durationMinutes')}
                        error={errors.durationMinutes?.message}
                    />
                    <Input
                        label="Precio (C$) *"
                        type="number"
                        step="0.01"
                        {...register('price')}
                        error={errors.price?.message}
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Estado *</label>
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <select
                                {...field}
                                className="form-select w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-brand-light focus:ring-1 focus:ring-brand-light/10 transition-all outline-none"
                            >
                                <option value="active">Activo</option>
                                <option value="inactive">Inactivo</option>
                            </select>
                        )}
                    />
                </div>

                <div className="pt-4 flex gap-3 justify-end">
                    <Button variant="ghost" type="button" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit">
                        {initialData ? 'Guardar Cambios' : 'Crear Servicio'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
