import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import erpApi from '../../api/erpApi';
import { useAuth } from '../../context/AuthContext';

const estadoBadge = (stock, comprometido) => {
  const disponible = stock - comprometido;
  if (disponible === 0) return { label: 'AGOTADO', cls: 'bg-red-50 text-red-700' };
  if (disponible <= 2) return { label: 'POR AGOTARSE', cls: 'bg-amber-50 text-amber-700' };
  return { label: 'DISPONIBLE', cls: 'bg-emerald-50 text-emerald-700' };
};

const Inventario = () => {
  const { isAdmin } = useAuth();
  const [filtro, setFiltro] = useState('');
  const [filtroGenero, setFiltroGenero] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');

  const { data: productos = [], isLoading, refetch } = useQuery({
    queryKey: ['inventario'],
    queryFn: () => erpApi.get('/inventario').then(r => r.data),
    refetchInterval: 30000,
  });

  const marcas = [...new Set(productos.map(p => p.marca))];
  const generos = [...new Set(productos.map(p => p.genero))];

  const filtrados = productos.filter(p => {
    const texto = filtro.toLowerCase();
    const coincideTexto = !filtro ||
      p.nombre_producto?.toLowerCase().includes(texto) ||
      p.marca?.toLowerCase().includes(texto) ||
      p.concentracion?.toLowerCase().includes(texto);
    const coincideGenero = !filtroGenero || p.genero === filtroGenero;
    const coincideMarca = !filtroMarca || p.marca === filtroMarca;
    return coincideTexto && coincideGenero && coincideMarca;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-400 mt-0.5">{filtrados.length} productos</p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
        >
          Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar producto, marca..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 w-64"
        />
        <select
          value={filtroMarca}
          onChange={e => setFiltroMarca(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          <option value="">Todas las marcas</option>
          {marcas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filtroGenero}
          onChange={e => setFiltroGenero(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          <option value="">Todos los géneros</option>
          {generos.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-sm text-gray-400 text-center">Cargando inventario...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Producto</th>
                <th className="text-left px-4 py-3 font-medium">Marca</th>
                <th className="text-left px-4 py-3 font-medium">Concentración</th>
                <th className="text-left px-4 py-3 font-medium">Género</th>
                <th className="text-center px-4 py-3 font-medium">Stock</th>
                <th className="text-center px-4 py-3 font-medium">Comprometido</th>
                <th className="text-center px-4 py-3 font-medium">Disponible</th>
                <th className="text-right px-4 py-3 font-medium">Precio</th>
                {isAdmin && <th className="text-right px-4 py-3 font-medium">Costo</th>}
                <th className="text-center px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => {
                  const disponible = p.stock - p.comprometido;
                  const badge = estadoBadge(p.stock, p.comprometido);
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{p.nombre_producto}</td>
                      <td className="px-4 py-3 text-gray-500">{p.marca}</td>
                      <td className="px-4 py-3 text-gray-500">{p.concentracion}</td>
                      <td className="px-4 py-3 text-gray-500">{p.genero}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{p.stock}</td>
                      <td className="px-4 py-3 text-center text-amber-600 font-medium">{p.comprometido}</td>
                      <td className="px-4 py-3 text-center text-emerald-700 font-semibold">{disponible}</td>
                      <td className="px-4 py-3 text-right text-gray-700">S/ {Number(p.precio).toFixed(2)}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right text-gray-400 text-xs">S/ {Number(p.costo).toFixed(2)}</td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Inventario;