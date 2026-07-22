import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
// import type { LocationState } from '../../interfaces/auth';
import { loginSchema, type LoginForm } from '../../schemas/login';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { AppError } from '../../services/errors';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    // const location = useLocation();
    const { login } = useAuth();
    const { showToast } = useToast();

    // Redirect back to the page the user originally wanted to visit
    // const from = (location.state as LocationState)?.from?.pathname ?? '/';

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async ({ email, password }: LoginForm) => {
        try {
            await login(email, password);
            const sessionStatus = localStorage.getItem('cash_session_status');
            const sessionId = localStorage.getItem('cash_session_id');

            if (sessionStatus === 'suspended' && sessionId) {
                navigate(`/cash/resume/${sessionId}`, { replace: true });
            } else if (sessionStatus === 'open') {
                navigate('/', { replace: true });
            } else {
                navigate('/cash/open', { replace: true });
            }
        } catch (error) {
            const appError = AppError.from(error);
            showToast(appError.message, 'error');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-muted/20 blur-3xl"></div>
                <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-brand/10 blur-3xl"></div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center flex-col items-center">
                    <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/30 mb-2">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
                        HappyPet
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600">
                        Sistema de Inventario y Punto de Venta
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
                    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                        <Input
                            label="Correo Electrónico"
                            type="email"
                            placeholder="ejemplo@happypet.com"
                            {...register('email')}
                            error={errors.email?.message}
                        />

                        <div>
                            <Input
                                label="Contraseña"
                                type="password"
                                placeholder="••••••••"
                                {...register('password')}
                                error={errors.password?.message}
                            />
                            <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        type="checkbox"
                                        className="h-4 w-4 text-brand focus:ring-brand border-slate-300 rounded cursor-pointer"
                                    />
                                    <label
                                        htmlFor="remember-me"
                                        className="ml-2 block text-sm text-slate-700 cursor-pointer"
                                    >
                                        Recordarme
                                    </label>
                                </div>

                                <div className="text-sm">
                                    <a
                                        href="#"
                                        className="font-medium text-brand hover:text-brand-light transition-colors"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                className="w-full justify-center py-2.5 text-base"
                                isLoading={isSubmitting}
                            >
                                Iniciar Sesión
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
