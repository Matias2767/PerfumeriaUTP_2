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
    } catch (err) {
      setError('Usuario o contrasena incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-md">

        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-emerald-700 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Marly Perfumeria</h1>
          <p className="text-sm text-gray-500 mt-1">Panel de administracion</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input
              type="text"
              required
              value={form.usuario}
              onChange={(e) => setForm({ ...form, usuario: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              placeholder="Nombre de usuario"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
