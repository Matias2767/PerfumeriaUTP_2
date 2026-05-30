import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/',          label: 'Dashboard',   icon: '▦' },
  { to: '/inventario',label: 'Inventario',  icon: '⊞' },
  { to: '/reservas',  label: 'Reservas',    icon: '✦' },
  { to: '/entregas',  label: 'Entregas',    icon: '⬆' },
  { to: '/alertas',   label: 'Alertas',     icon: '⚑' },
];

const Sidebar = () => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      <div className="px-5 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Marly</p>
            <p className="text-xs text-gray-400">Perfumería</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-900 truncate">{user?.nombre}</p>
          <p className="text-xs text-gray-400">{isAdmin ? 'Administrador' : 'Usuario'}</p>
        </div>
        <button
          onClick={logout}
          className="w-full text-left text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;