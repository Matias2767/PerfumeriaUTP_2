import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import erpApi from '../../api/erpApi';
import { useAuth } from '../../context/AuthContext';

const tabs = [
  { key: 'O', label: 'Abiertas' },
  { key: 'A', label: 'Aprobadas' },
  { key: 'C', label: 'Cerradas' },
  { key: 'D', label: 'Canceladas' },
];

const statusColor = {
  O: 'bg-blue-50 text-blue-700',
  A: 'bg-emerald-50 text-emerald-700',
  C: 'bg-gray-100 text-gray-500',
  D: 'bg-red-50 text-red-600',
};

const statusLabel = { O: 'Abierta', A: 'Aprobada', C: 'Cerrada', D: 'Cancelada' };

const Reservas = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('O');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ cliente: '', producto_id: '', cantidad: 1, notas: '' });

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ['reservas', tab],
    queryFn: () => erpApi.get(`/reservas?status=${tab}`).then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['productos-select'],
    queryFn: () => erpApi.get('/inventario').then(r => r.data),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['reservas'] });
    queryClient.invalidateQueries({ queryKey: ['kpis'] });
    queryClient.invalidateQueries({ queryKey: ['inventario'] });
  };

  const aprobar = useMutation({
    mutationFn: (id) => erpApi.put(`/reservas/${id}/aprobar`),
    onSuccess: invalidate,
  });

  const cancelar = useMutation({
    mutationFn: (id) => erpApi.put(`/reservas/${id}/cancelar`),
    onSuccess: invalidate,
  });

  const crear = useMutation({
    mutationFn: (data) => erpApi.post('/reservas', data),
    onSuccess: () => {
      invalidate();
      setShowModal(false);
      setForm({ cliente: '', producto_id: '', cantidad: 1, notas: '' });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reservas</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestión de órdenes de clientes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nueva reserva
        </button>
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-sm text-gray-400 text-center">Cargando reservas...</div>
        ) : reservas.length === 0 ? (
          <div className="p-8 text-sm text-gray-400 text-center">No hay reservas {statusLabel[tab].toLowerCase()}s</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Producto</th>
                <th className="text-center px-4 py-3 font-medium">Cant.</th>
                <th className="text-left px-4 py-3 font-medium">Fecha</th>
                <th className="text-center px-4 py-3 font-medium">Estado</th>
                {isAdmin && tab === 'O' && (
                  <th className="text-center px-4 py-3 font-medium">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {reservas.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">#{r.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.cliente}</td>
                  <td className="px-4 py-3 text-gray-600">{r.producto}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{r.cantidad}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(r.fecha_creacion).toLocaleDateString('es-PE')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${statusColor[r.status]}`}>
                      {statusLabel[r.status]}
                    </span>
                  </td>
                  {isAdmin && tab === 'O' && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => aprobar.mutate(r.id)}
                          disabled={aprobar.isPending}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Aprobar y comprometer
                        </button>
                        <button
                          onClick={() => cancelar.mutate(r.id)}
                          disabled={cancelar.isPending}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Nueva reserva</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
                <input
                  type="text"
                  value={form.cliente}
                  onChange={e => setForm({ ...form, cliente: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Producto</label>
                <select
                  value={form.producto_id}
                  onChange={e => setForm({ ...form, producto_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="">Seleccionar producto</option>
                  {productos
                    .filter(p => (p.stock - p.comprometido) > 0)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre_producto} — {p.marca} (disponible: {p.stock - p.comprometido})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={form.cantidad}
                  onChange={e => setForm({ ...form, cantidad: parseInt(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
                <textarea
                  value={form.notas}
                  onChange={e => setForm({ ...form, notas: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => crear.mutate(form)}
                disabled={!form.cliente || !form.producto_id || crear.isPending}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {crear.isPending ? 'Guardando...' : 'Crear reserva'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reservas;