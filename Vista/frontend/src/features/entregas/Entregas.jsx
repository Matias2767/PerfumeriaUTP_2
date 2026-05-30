import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import erpApi from '../../api/erpApi';

const Entregas = () => {
  const queryClient = useQueryClient();
  const [fechas, setFechas] = useState({});

  const { data: entregas = [], isLoading } = useQuery({
    queryKey: ['entregas'],
    queryFn: () => erpApi.get('/reservas?status=A').then(r => r.data),
    refetchInterval: 15000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['entregas'] });
    queryClient.invalidateQueries({ queryKey: ['reservas'] });
    queryClient.invalidateQueries({ queryKey: ['kpis'] });
    queryClient.invalidateQueries({ queryKey: ['inventario'] });
  };

  const despachar = useMutation({
    mutationFn: ({ id, fecha }) => erpApi.post(`/entregas/${id}/despachar`, { fecha_entrega: fecha }),
    onSuccess: invalidate,
  });

  const hoy = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Entregas</h1>
        <p className="text-sm text-gray-400 mt-0.5">Reservas aprobadas listas para despacho</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-sm text-gray-400 text-center">Cargando entregas...</div>
        ) : entregas.length === 0 ? (
          <div className="p-8 text-sm text-gray-400 text-center">No hay entregas pendientes</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Producto</th>
                <th className="text-center px-4 py-3 font-medium">Cant.</th>
                <th className="text-left px-4 py-3 font-medium">Fecha reserva</th>
                <th className="text-left px-4 py-3 font-medium">Fecha entrega</th>
                <th className="text-center px-4 py-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {entregas.map((e) => {
                const fechaMin = new Date(e.fecha_creacion).toISOString().split('T')[0];
                const fechaSeleccionada = fechas[e.id] || hoy;
                return (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">#{e.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{e.cliente}</td>
                    <td className="px-4 py-3 text-gray-600">{e.producto}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{e.cantidad}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(e.fecha_creacion).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        min={fechaMin}
                        value={fechaSeleccionada}
                        onChange={ev => setFechas({ ...fechas, [e.id]: ev.target.value })}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => despachar.mutate({ id: e.id, fecha: fechaSeleccionada })}
                        disabled={despachar.isPending}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Registrar entrega y salida
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Entregas;