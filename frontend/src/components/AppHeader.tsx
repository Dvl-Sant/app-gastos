import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, History, LayoutDashboard, Wallet, CalendarRange } from 'lucide-react';
import { App as AntApp } from 'antd';
import { clearSession, getSession } from '../auth/session';

interface Props {
    icon: React.ReactNode;
    subtitle: string;
    title: string;
}

const NAV_ITEMS = [
    { path: '/', label: 'Panel', icon: LayoutDashboard },
    { path: '/accounts', label: 'Cuentas', icon: Wallet },
    { path: '/flujo', label: 'Flujo', icon: CalendarRange },
    { path: '/history', label: 'Historial', icon: History },
];

export default function AppHeader({ icon, subtitle, title }: Props) {
    const navigate = useNavigate();
    const location = useLocation();
    const { message } = AntApp.useApp();
    const today = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const handleLogout = () => {
        clearSession();
        message.success('Sesión cerrada');
        navigate('/login', { replace: true });
    };

    return (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border-subtle px-4 py-3">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                        {icon}
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{subtitle}</p>
                        <h1 className="text-base font-bold text-slate-900">{title}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="hidden md:flex flex-col items-end mr-2">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Hoy es</p>
                        <h2 className="text-sm font-bold text-slate-900 capitalize">{today}</h2>
                    </div>
                    <nav className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                        {NAV_ITEMS.map(({ path, label, icon: NavIcon }) => {
                            const active = location.pathname === path;
                            return (
                                <button
                                    key={path}
                                    onClick={() => navigate(path)}
                                    className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg transition ${
                                        active ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <NavIcon className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">{label}</span>
                                </button>
                            );
                        })}
                    </nav>
                    <button
                        onClick={handleLogout}
                        title={`Cerrar sesión (${getSession()?.user.username ?? ''})`}
                        className="text-slate-400 hover:text-danger bg-slate-50 p-2 rounded-xl transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>
    );
}
