import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { userService } from '../../services/user';
import { getErrorMessage } from '../../utils/error';

const authSchema = z.object({
    code: z
        .string()
        .min(1, 'El código es requerido')
        .max(6, 'El código no puede tener más de 6 caracteres'),
});

type AuthForm = z.infer<typeof authSchema>;

interface ManagerAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Se llama con el código validado. El padre lo cachea y continúa la acción. */
    onSuccess: (code: string) => void;
    /** Mensaje contextual que reemplaza el texto por defecto. */
    message?: string;
}

export const ManagerAuthModal: React.FC<ManagerAuthModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    message = 'Para registrar movimientos de inventario necesitas el código de autorización de un gerente o administrador.',
}) => {
    const [isVerifying, setIsVerifying] = React.useState(false);
    const [verifyError, setVerifyError] = React.useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<AuthForm>({
        resolver: zodResolver(authSchema),
        defaultValues: { code: '' },
    });

    // Limpiar el formulario y los errores cada vez que se abre el modal.
    React.useEffect(() => {
        if (isOpen) {
            reset({ code: '' });
            setVerifyError(null);
        }
    }, [isOpen, reset]);

    const onSubmit = async (data: AuthForm) => {
        setVerifyError(null);
        setIsVerifying(true);
        try {
            const resp = await userService.verifyCode(data.code);
            if (resp.valid) {
                onSuccess(data.code);
            } else {
                setVerifyError('Código de autorización inválido.');
            }
        } catch (err) {
            setVerifyError(getErrorMessage(err, 'No se pudo verificar el código.'));
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Autorización requerida" width="sm">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-600">
                        <ShieldCheck size={20} />
                    </div>
                    <p className="text-sm text-amber-800">{message}</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Código de autorización <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="off"
                        autoFocus
                        maxLength={6}
                        className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                        placeholder="••••••"
                        {...register('code')}
                    />
                    {errors.code && (
                        <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
                    )}
                    {verifyError && <p className="mt-1 text-sm text-red-600">{verifyError}</p>}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" type="button" onClick={onClose} disabled={isVerifying}>
                        Cancelar
                    </Button>
                    <Button type="submit" isLoading={isVerifying} disabled={isVerifying}>
                        Autorizar
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
