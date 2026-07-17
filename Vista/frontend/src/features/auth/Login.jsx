import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import erpApi from '../../api/erpApi';

const Login = () => {
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await erpApi.post('/auth/login', form);
      login(res.data.user, res.data.token);
      navigate('/');
    } catch {
      setError('Usuario o contrasena incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="client-shell min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/88 rounded-[2rem] shadow-2xl shadow-rose-950/10 border border-pink-100 p-10 w-full max-w-md backdrop-blur">

        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-rose-500 via-pink-500 to-amber-400 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-rose-200">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <h1 className="text-xl font-semibold text-rose-950">Marly Perfumeria</h1>
          <p className="text-sm text-rose-400 mt-1">Panel de administracion</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-rose-700 mb-1">Usuario</label>
            <input
              type="text"
              required
              value={form.usuario}
              onChange={(e) => setForm({ ...form, usuario: e.target.value })}
              className="client-input w-full"
              placeholder="Nombre de usuario"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-rose-700 mb-1">Contrasena</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="client-input w-full"
              placeholder="********"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="client-primary-button w-full disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
