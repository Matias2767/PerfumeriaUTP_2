import { useQuery } from '@tanstack/react-query';
import erpApi from '../../api/erpApi';

const Alertas = () => {
  const { data: productos = [], isLoading } = useQuery({
    queryKey: ['inventario'],
    queryFn: () => erpApi.get('/inventario').then(r => r.data),
    refetchInterval: 30000,
  });

  const agotados = productos.filter(p => (p.stock - p.comprometido) === 0);
  const porAgotarse = productos.filter(p => {
    const disp = p.stock - p.comprometido;
    return disp > 0 && disp <= (p.stock_minimo ?? 2);
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Alertas de stock</h1>
        <p className="text-sm text-gray-400 mt-0.5">Productos que requieren reposición</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-400">Cargando alertas...</div>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <h2 className="text-sm font-medium text-gray-700">Agotados ({agotados.length})</h2>
            </div>
            {agotados.length === 0 ? (
              <p className="text-sm text-gray-400 ml-4">Sin productos agotados</p>
            ) : (
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-red-50 border-b border-red-100">
                    <tr className="text-xs text-red-400 uppercase tracking-wide">
                      <th className="text-left px-4 py-3 font-medium">Producto</th>
                      <th className="text-left px-4 py-3 font-medium">Marca</th>
                      <th className="text-center px-4 py-3 font-medium">Stock</th>
                      <th className="text-center px-4 py-3 font-medium">Comprometido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agotados.map(p => (
                      <tr key={p.id} className="border-b border-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{p.nombre_producto}</td>
                        <td className="px-4 py-3 text-gray-500">{p.marca}</td>
                        <td className="px-4 py-3 text-center text-red-600 font-semibold">{p.stock}</td>
                        <td className="px-4 py-3 text-center text-amber-600">{p.comprometido}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <h2 className="text-sm font-medium text-gray-700">Por agotarse ({porAgotarse.length})</h2>
            </div>
            {porAgotarse.length === 0 ? (
              <p className="text-sm text-gray-400 ml-4">Sin productos por agotarse</p>
            ) : (
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-amber-50 border-b border-amber-100">
                    <tr className="text-xs text-amber-500 uppercase tracking-wide">
                      <th className="text-left px-4 py-3 font-medium">Producto</th>
                      <th className="text-left px-4 py-3 font-medium">Marca</th>
                      <th className="text-center px-4 py-3 font-medium">Stock</th>
                      <th className="text-center px-4 py-3 font-medium">Disponible</th>
                      <th className="text-center px-4 py-3 font-medium">Comprometido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porAgotarse.map(p => (
                      <tr key={p.id} className="border-b border-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{p.nombre_producto}</td>
                        <td className="px-4 py-3 text-gray-500">{p.marca}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{p.stock}</td>
                        <td className="px-4 py-3 text-center text-amber-600 font-semibold">{p.stock - p.comprometido}</td>
                        <td className="px-4 py-3 text-center text-gray-500">{p.comprometido}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Alertas;