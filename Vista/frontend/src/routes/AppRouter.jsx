import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from '../features/auth/Login';
import Layout from '../components/Layout';
import Dashboard from '../features/dashboard/Dashboard';
import Inventario from '../features/inventario/Inventario';
import Reservas from '../features/reservas/Reservas';
import Entregas from '../features/entregas/Entregas';
import Alertas from '../features/alertas/Alertas';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="reservas" element={<Reservas />} />
          <Route path="entregas" element={<Entregas />} />
          <Route path="alertas" element={<Alertas />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;