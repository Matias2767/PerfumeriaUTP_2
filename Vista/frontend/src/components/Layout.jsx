import { Link, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { user, isAdmin } = useAuth();

  if (!user) {
    return (
      <div className="client-shell min-h-screen">
        <header className="sticky top-0 z-40 border-b border-rose-100 bg-white/86 px-5 py-4 shadow-sm backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 via-pink-500 to-amber-400 shadow-lg shadow-rose-200">
                <span className="text-sm font-bold text-white">M</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-rose-950">Marly</p>
                <p className="text-xs text-rose-400">Perfumeria</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 hover:text-rose-950"
              >
                Iniciar sesion
              </Link>
              <Link
                to="/registro"
                className="rounded-xl bg-gradient-to-r from-rose-500 to-amber-400 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-rose-200/70 transition-transform hover:-translate-y-0.5"
              >
                Registrarse
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen ${isAdmin ? 'bg-gray-50' : 'client-shell'}`}>
      <Sidebar />
      <main className={`flex-1 overflow-auto ${isAdmin ? 'p-8' : 'p-5 lg:p-8'}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
