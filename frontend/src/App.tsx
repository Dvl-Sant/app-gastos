import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { App as AntApp, ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import { AnimatePresence, motion } from 'framer-motion';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import AccountsPage from './pages/AccountsPage';
import CashflowPage from './pages/CashflowPage';
import ProtectedRoute from './components/ProtectedRoute';

const theme = {
    token: {
        colorPrimary: '#1772da',
        fontFamily: "'Inter', sans-serif",
        borderRadius: 12,
    },
};

const pageMotion = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.25, ease: 'easeOut' as const },
};

function AnimatedRoutes() {
    const location = useLocation();
    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <motion.div {...pageMotion} className="min-h-screen">
                                <DashboardPage />
                            </motion.div>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/accounts"
                    element={
                        <ProtectedRoute>
                            <motion.div {...pageMotion} className="min-h-screen">
                                <AccountsPage />
                            </motion.div>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/flujo"
                    element={
                        <ProtectedRoute>
                            <motion.div {...pageMotion} className="min-h-screen">
                                <CashflowPage />
                            </motion.div>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/history"
                    element={
                        <ProtectedRoute>
                            <motion.div {...pageMotion} className="min-h-screen">
                                <HistoryPage />
                            </motion.div>
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<LoginPage />} />
            </Routes>
        </AnimatePresence>
    );
}

export default function App() {
    return (
        <ConfigProvider locale={esES} theme={theme}>
            <AntApp>
                <BrowserRouter>
                    <AnimatedRoutes />
                </BrowserRouter>
            </AntApp>
        </ConfigProvider>
    );
}
