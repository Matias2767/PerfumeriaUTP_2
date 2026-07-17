import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import erpApi from '../../api/erpApi';

const Registro = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    usuario: '',
    password: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await erpApi.post('/auth/registro', {
        usuario: form.usuario,
        password: form.password,
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email || undefined,
        telefono: form.telefono || undefined,
      });
      navigate('/login', {
        replace: true,
        state: { message: 'Cuenta creada correctamente. Ya puedes iniciar sesion.' },
      });
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear la cuenta.');
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
          <h1 className="text-xl font-semibold text-rose-950">Crear cuenta</h1>
          <p className="text-sm text-rose-400 mt-1">Reserva fragancias y revisa tus solicitudes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-rose-700 mb-1">Usuario</label>
            <input
              type="text"
              required
              value={form.usuario}
              onChange={(event) => setForm({ ...form, usuario: event.target.value })}
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
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="client-input w-full"
              placeholder="********"
              autoComplete="new-password"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-rose-700 mb-1">Nombre</label>
              <input
                type="text"
                required
                value={form.nombre}
                onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                className="client-input w-full"
                placeholder="Nombre"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-rose-700 mb-1">Apellido</label>
              <input
                type="text"
                required
                value={form.apellido}
                onChange={(event) => setForm({ ...form, apellido: event.target.value })}
                className="client-input w-full"
                placeholder="Apellido"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-rose-700 mb-1">Correo</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="client-input w-full"
              placeholder="correo@ejemplo.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-rose-700 mb-1">Telefono</label>
            <input
              type="tel"
              value={form.telefono}
              onChange={(event) => setForm({ ...form, telefono: event.target.value })}
              className="client-input w-full"
              placeholder="Opcional"
              autoComplete="tel"
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
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-rose-500">
          Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-pink-600 hover:text-pink-700">
            Iniciar sesion
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Registro;
