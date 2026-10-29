import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, App as AntApp } from 'antd';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { apiFetch } from '../api/client';
import { getSession, setSession } from '../auth/session';
import type { User } from '../types';

interface AuthResponse {
    token: string;
    user: User;
}

// /api/auth responde con el envelope estándar { status, data }
type AuthApiResponse = { status: string; data: AuthResponse };

interface LoginForm {
    username: string;
    password: string;
}

interface RegisterForm extends LoginForm {
    confirm: string;
}

export default function LoginPage() {
    const navigate = useNavigate();
    const { message } = AntApp.useApp();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [loading, setLoading] = useState(false);
    const [loginForm] = Form.useForm<LoginForm>();
    const [registerForm] = Form.useForm<RegisterForm>();

    useEffect(() => {
        if (getSession()) navigate('/', { replace: true });
    }, [navigate]);

    const onLogin = async (values: LoginForm) => {
        setLoading(true);
        try {
            const body = await apiFetch<AuthApiResponse>('/auth/login', {
                method: 'POST',
                body: JSON.stringify(values),
            });
            if (!body?.data?.token || !body?.data?.user) {
                throw new Error('Respuesta inválida del servidor');
            }
            setSession(body.data.token, body.data.user);
            message.success(`¡Bienvenido, ${body.data.user.username}!`);
            navigate('/', { replace: true });
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Error del servidor. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const onRegister = async (values: RegisterForm) => {
        if (values.password !== values.confirm) {
            message.error('Las contraseñas no coinciden');
            return;
        }
        setLoading(true);
        try {
            const body = await apiFetch<AuthApiResponse>('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username: values.username.trim(), password: values.password }),
            });
            if (!body?.data?.token || !body?.data?.user) {
                throw new Error('Respuesta inválida del servidor');
            }
            setSession(body.data.token, body.data.user);
            message.success('Cuenta creada. ¡Bienvenido!');
            navigate('/', { replace: true });
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Error del servidor. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const tabClass = (active: boolean) =>
        `flex-1 text-xs font-bold uppercase tracking-wider py-2.5 rounded-md transition ${
            active ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'
        }`;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background-light">
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200"
            >
                <div className="p-8 pb-0">
                    <div className="text-center mb-6">
                        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mx-auto mb-4">
                            <Wallet className="text-primary w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">AppGastos</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {mode === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta nueva'}
                        </p>
                    </div>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-lg mb-6">
                        <button onClick={() => setMode('login')} className={tabClass(mode === 'login')}>
                            Iniciar Sesión
                        </button>
                        <button onClick={() => setMode('register')} className={tabClass(mode === 'register')}>
                            Registrarse
                        </button>
                    </div>
                </div>

                <div className="px-8 pb-8">
                    {mode === 'login' ? (
                        <Form form={loginForm} layout="vertical" onFinish={onLogin} requiredMark={false}>
                            <Form.Item
                                name="username"
                                label={<span className="text-xs font-bold uppercase tracking-wider text-slate-500">Usuario</span>}
                                rules={[{ required: true, message: 'Ingresa tu usuario' }]}
                            >
                                <Input size="large" placeholder="Tu usuario" />
                            </Form.Item>
                            <Form.Item
                                name="password"
                                label={<span className="text-xs font-bold uppercase tracking-wider text-slate-500">Contraseña</span>}
                                rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
                            >
                                <Input.Password size="large" placeholder="••••••••" />
                            </Form.Item>
                            <Button type="primary" htmlType="submit" size="large" block loading={loading} className="mt-2 h-14 font-bold">
                                Ingresar
                            </Button>
                        </Form>
                    ) : (
                        <Form form={registerForm} layout="vertical" onFinish={onRegister} requiredMark={false}>
                            <Form.Item
                                name="username"
                                label={<span className="text-xs font-bold uppercase tracking-wider text-slate-500">Usuario</span>}
                                rules={[{ required: true, message: 'Elige un nombre de usuario' }]}
                            >
                                <Input size="large" placeholder="Elige un nombre de usuario" />
                            </Form.Item>
                            <Form.Item
                                name="password"
                                label={<span className="text-xs font-bold uppercase tracking-wider text-slate-500">Contraseña</span>}
                                rules={[
                                    { required: true, message: 'Ingresa una contraseña' },
                                    { min: 6, message: 'Mínimo 6 caracteres' },
                                ]}
                            >
                                <Input.Password size="large" placeholder="Mínimo 6 caracteres" />
                            </Form.Item>
                            <Form.Item
                                name="confirm"
                                label={<span className="text-xs font-bold uppercase tracking-wider text-slate-500">Confirmar Contraseña</span>}
                                rules={[{ required: true, message: 'Repite tu contraseña' }]}
                            >
                                <Input.Password size="large" placeholder="Repite tu contraseña" />
                            </Form.Item>
                            <Button type="primary" htmlType="submit" size="large" block loading={loading} className="mt-2 h-14 font-bold !bg-success hover:!bg-success/90">
                                Crear Cuenta
                            </Button>
                        </Form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
