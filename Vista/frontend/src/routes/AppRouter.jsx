import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from '../features/auth/Login';
import Layout from '../components/Layout';
import Dashboard from '../features/dashboard/Dashboard';
import Inventario from '../features/inventario/Inventario';
import Reservas from '../features/reservas/Reservas';
import Entregas from '../features/entregas/Entregas';
import Alertas from '../features/alertas/Alertas';
import CatalogoCliente from '../features/cliente/CatalogoCliente';
import MisReservasCliente from '../features/cliente/MisReservasCliente';
import Registro from '../features/auth/Registro';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
};

const AdminRoute = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return isAdmin ? children : <Navigate to="/" replace />;
};

const GuestRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : children;
};

const HomeRoute = () => {
  const { isAdmin } = useAuth();
  return isAdmin ? <Dashboard /> : <CatalogoCliente />;
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/registro" element={<GuestRoute><Registro /></GuestRoute>} />
        <Route path="/" element={<Layout />}>
          <Route index element={<HomeRoute />} />
          <Route path="mis-reservas" element={<PrivateRoute><MisReservasCliente /></PrivateRoute>} />
          <Route path="inventario" element={<AdminRoute><Inventario /></AdminRoute>} />
          <Route path="reservas" element={<AdminRoute><Reservas /></AdminRoute>} />
          <Route path="entregas" element={<AdminRoute><Entregas /></AdminRoute>} />
          <Route path="alertas" element={<AdminRoute><Alertas /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
