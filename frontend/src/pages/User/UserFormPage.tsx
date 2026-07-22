import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { FormSection } from '../../components/ui/FormSection';
import { TogglePills } from '../../components/ui/TogglePills';
import { QuickActionsSidebar } from '../../components/ui/QuickActionsSidebar';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useUsers } from './useUsers';
import { userService } from '../../services/user';
import { useAuth } from '../../hooks/useAuth';
import { AlertCircle, Save, X, User, Lock, ShieldCheck, RefreshCw, Trash2 } from 'lucide-react';

const userSchema = z
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

type UserFormData = z.infer<typeof userSchema>;

const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const ROLE_OPTIONS = [
    { value: 'cashier', label: 'Cajero' },
    { value: 'manager', label: 'Gerente' },
    { value: 'admin', label: 'Administrador' },
];

const STATUS_OPTIONS = [
    { value: 'true', label: 'Activo', activeClass: 'border-emerald-500 bg-emerald-500 text-white' },
    { value: 'false', label: 'Inactivo', activeClass: 'border-slate-400 bg-slate-400 text-white' },
];

export const UserFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addUser, updateUser, deleteUser, fetchUsers, isLoading } = useUsers();
    const { user: currentUser } = useAuth();
    const [formError, setFormError] = useState<string | null>(null);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [userData, setUserData] = useState<{
        name: string;
        email: string;
        role: string;
        is_active: boolean;
        code?: string;
    } | null>(null);
    const isEditing = Boolean(id);

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            password_confirm: '',
            role: 'cashier',
            code: '',
            is_active: true,
        },
    });

    const selectedRole = useWatch({ control, name: 'role' });
    const isAdminOrManager = selectedRole === 'admin' || selectedRole === 'manager';
    const isCurrentUserAdmin = currentUser?.role === 'admin';
    console.log(currentUser);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        if (isEditing && id) {
            userService.getUserById(parseInt(id, 10)).then((user) => {
                if (user) {
                    setUserData({
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        is_active: user.is_active,
                        code: user.code,
                    });
                }
            });
        }
    }, [isEditing, id]);

    useEffect(() => {
        if (isEditing && userData) {
            reset({
                name: userData.name,
                email: userData.email,
                role: userData.role as 'admin' | 'manager' | 'cashier',
                is_active: userData.is_active,
                password: '',
                password_confirm: '',
                code: userData.code || '',
            });
        }
    }, [isEditing, userData, reset]);

    const isFormLoading = isSubmitting || isLoading;

    const onSubmit = async (data: UserFormData) => {
        setFormError(null);
        try {
            if (isEditing) {
                const updatePayload: Record<string, unknown> = {
                    name: data.name,
                    role: data.role,
                    is_active: data.is_active,
                };
                if (data.password) {
                    updatePayload.password = data.password;
                }
                if (data.code) {
                    updatePayload.code = data.code;
                }
                await updateUser(id!, updatePayload);
            } else {
                if (!data.password) {
                    setFormError('La contraseña es requerida al crear un usuario');
                    return;
                }
                await addUser({
                    email: data.email,
                    name: data.name,
                    password: data.password,
                    role: data.role,
                    is_active: data.is_active,
                    code: data.code || undefined,
                });
            }
            navigate('/users');
        } catch {
            setFormError('Ocurrió un error al procesar la solicitud.');
        }
    };

    const goToUsers = () => navigate('/users');
    const handleGenarateCode = () =>
        setValue('code', generateCode(), {
            shouldValidate: true,
        });

    const handleConfirmDelete = async () => {
        if (!id) return;
        setIsDeleting(true);
        const success = await deleteUser(id);
        setIsDeleting(false);
        setShowConfirmDelete(false);
        if (success) goToUsers();
    };

    const sidebarActions = useMemo(
        () => [
            {
                id: 'save',
                label: isEditing ? 'Guardar cambios' : 'Crear usuario',
                description: isEditing ? 'Actualizar datos del usuario' : 'Crear un nuevo usuario',
                icon: Save,
                variant: 'primary' as const,
                isLoading: isFormLoading,
                disabled: isFormLoading,
                onClick: () => handleSubmit(onSubmit)(),
            },
            {
                id: 'cancel',
                label: 'Cancelar',
                description: 'Volver al listado',
                icon: X,
                variant: 'default' as const,
                disabled: isFormLoading,
                onClick: goToUsers,
            },
            {
                id: 'delete',
                label: 'Eliminar usuario',
                description: 'Esta acción es irreversible',
                icon: Trash2,
                variant: 'danger' as const,
                dividerBefore: true,
                hidden: !isEditing,
                isLoading: isDeleting,
                onClick: () => setShowConfirmDelete(true),
            },
        ],
        [isEditing, isFormLoading, isDeleting],
    );

    return (
        <div>
            <PageHeader
                title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
                breadcrumbs={[
                    { label: 'Panel', path: '/' },
                    { label: 'Usuarios', path: '/users' },
                    { label: isEditing ? 'Editar' : 'Nuevo' },
                ]}
            />

            <div className="flex gap-6 items-start">
                <div className="flex-1 min-w-0">
                    <Card>
                        {formError && (
                            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{formError}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                            <FormSection
                                title="Datos del usuario"
                                description="Nombre e información de contacto"
                                icon={User}
                                iconBg="bg-brand/10"
                                iconColor="text-brand"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Nombre Completo"
                                        placeholder="Ej. Juan Pérez"
                                        {...register('name')}
                                        error={errors.name?.message}
                                        required
                                    />

                                    <Input
                                        label="Correo Electrónico"
                                        type="email"
                                        placeholder="juan@happypet.com"
                                        {...register('email')}
                                        error={errors.email?.message}
                                        required
                                    />
                                </div>
                            </FormSection>

                            <FormSection
                                title="Seguridad"
                                description={
                                    isEditing
                                        ? 'Deja la contraseña vacía para no cambiarla'
                                        : 'Contraseña de acceso al sistema'
                                }
                                icon={Lock}
                                iconBg="bg-amber-100"
                                iconColor="text-amber-600"
                            >
                                {isCurrentUserAdmin && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <Input
                                            label={
                                                isEditing
                                                    ? 'Nueva Contraseña (Opcional)'
                                                    : 'Contraseña'
                                            }
                                            type="password"
                                            placeholder="••••••••"
                                            {...register('password')}
                                            error={errors.password?.message}
                                            required={!isEditing}
                                        />
                                        <Input
                                            label={
                                                isEditing
                                                    ? 'Confirmar Nueva Contraseña'
                                                    : 'Confirmar Contraseña'
                                            }
                                            type="password"
                                            placeholder="••••••••"
                                            {...register('password_confirm')}
                                            error={errors.password_confirm?.message}
                                            required={!isEditing}
                                        />
                                    </div>
                                )}

                                {isAdminOrManager && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative">
                                            <Input
                                                label="Código de Autorización"
                                                type="text"
                                                placeholder="Ej. A7K2X9"
                                                maxLength={6}
                                                {...register('code')}
                                                error={errors.code?.message}
                                                readOnly={isEditing && !!userData?.code}
                                                disabled={isEditing && !!userData?.code}
                                            />
                                            {isEditing && !userData?.code && (
                                                <button
                                                    type="button"
                                                    onClick={handleGenarateCode}
                                                    className="absolute right-3 top-[34px] text-slate-500 hover:text-slate-600 p-1"
                                                    title="Generar código"
                                                >
                                                    <RefreshCw size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {isAdminOrManager && (
                                    <p className="text-xs text-slate-500 mt-2">
                                        {isEditing && !!userData?.code
                                            ? 'El código no se puede modificar después de creado.'
                                            : 'Este código es usado por cajeros para realizar acciones privilegiadas.'}
                                    </p>
                                )}

                                {!isCurrentUserAdmin && (
                                    <p className="text-sm text-slate-500">
                                        Solo un administrador puede cambiar la contraseña.
                                    </p>
                                )}
                            </FormSection>

                            <FormSection
                                title="Rol y estado"
                                description="Permisos y disponibilidad del usuario en el sistema"
                                icon={ShieldCheck}
                                iconBg="bg-violet-100"
                                iconColor="text-violet-600"
                            >
                                <div className="space-y-4">
                                    <Controller
                                        name="role"
                                        control={control}
                                        render={({ field }) => (
                                            <TogglePills
                                                label="Rol"
                                                required
                                                options={
                                                    ROLE_OPTIONS as unknown as {
                                                        value: string;
                                                        label: string;
                                                    }[]
                                                }
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={errors.role?.message}
                                            />
                                        )}
                                    />

                                    <Controller
                                        name="is_active"
                                        control={control}
                                        render={({ field }) => (
                                            <TogglePills
                                                label="Estado"
                                                required
                                                options={
                                                    STATUS_OPTIONS as unknown as {
                                                        value: string;
                                                        label: string;
                                                        activeClass: string;
                                                    }[]
                                                }
                                                value={String(field.value)}
                                                onChange={(v) => field.onChange(v === 'true')}
                                                error={errors.is_active?.message}
                                            />
                                        )}
                                    />
                                </div>
                            </FormSection>
                        </form>
                    </Card>
                </div>

                <QuickActionsSidebar actions={sidebarActions} />
            </div>

            <ConfirmDialog
                isOpen={showConfirmDelete}
                title="¿Eliminar usuario?"
                message="¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
                confirmLabel="Sí, eliminar"
                variant="danger"
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowConfirmDelete(false)}
            />
        </div>
    );
};
