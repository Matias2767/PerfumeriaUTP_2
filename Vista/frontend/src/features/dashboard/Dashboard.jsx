import { useQuery } from '@tanstack/react-query';
import erpApi from '../../api/erpApi';
import { useAuth } from '../../context/AuthContext';

const KpiCard = ({ label, value, sub, color }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-5">
    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
    <p className={`text-3xl font-semibold ${color || 'text-gray-900'}`}>{value ?? '—'}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => erpApi.get('/inventario/kpis').then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: reservasRecientes } = useQuery({
    queryKey: ['reservas-recientes'],
    queryFn: () => erpApi.get('/reservas?status=O&limit=5').then(r => r.data),
    refetchInterval: 15000,
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">
          Bienvenida, {user?.nombre} 👋
        </h1>
        <p className="text-sm text-gray-400 mt-1">Resumen general del sistema</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-400">Cargando métricas...</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Stock total" value={kpis?.stock} sub="unidades en almacén" />
          <KpiCard label="Disponible" value={kpis?.disponible} color="text-emerald-700" sub="listo para reservar" />
          <KpiCard label="Comprometido" value={kpis?.comprometido} color="text-amber-600" sub="en reservas abiertas" />
          <KpiCard label="Reservas abiertas" value={kpis?.abiertas} color="text-blue-600" sub="pendientes de aprobar" />
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Reservas pendientes de aprobación</h2>
        {!reservasRecientes || reservasRecientes.length === 0 ? (
          <p className="text-sm text-gray-400">No hay reservas abiertas en este momento.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2 font-medium">#</th>
                <th className="text-left pb-2 font-medium">Cliente</th>
                <th className="text-left pb-2 font-medium">Producto</th>
                <th className="text-left pb-2 font-medium">Cant.</th>
                <th className="text-left pb-2 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {reservasRecientes.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-gray-400 text-xs">#{r.id}</td>
                  <td className="py-2 font-medium text-gray-800">{r.cliente}</td>
                  <td className="py-2 text-gray-600">{r.producto}</td>
                  <td className="py-2 text-gray-600">{r.cantidad}</td>
                  <td className="py-2 text-gray-400 text-xs">{new Date(r.fecha_creacion).toLocaleDateString('es-PE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
