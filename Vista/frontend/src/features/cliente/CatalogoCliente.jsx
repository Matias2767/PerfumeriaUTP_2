import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import erpApi from '../../api/erpApi';
import { useAuth } from '../../context/AuthContext';
import heroImage from '../../images/Fondo1.png';

const imageModules = import.meta.glob('../../images/*.{jpg,jpeg,png}', {
  eager: true,
  import: 'default',
});

const productImages = Object.entries(imageModules).map(([path, url]) => ({
  name: path.split('/').pop().replace(/\.[^.]+$/, ''),
  url,
}));

const publicProducts = productImages.map((image, index) => ({
  id: `public-${index}`,
  product_id: null,
  nombre_producto: image.name,
  marca: 'Marly',
  familia: 'Fragancia',
  grupo: 'Perfumes',
  genero: '',
  concentracion: '',
  descripcion: 'Una fragancia seleccionada para acompanar momentos especiales.',
  precio: null,
  stock: 1,
  comprometido: 0,
  disponible: 1,
  active: true,
}));

const todayISO = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const normalize = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(value || 0));

const productImage = (product, index) => {
  const name = normalize(product.nombre_producto);
  const haystack = normalize(
    `${product.nombre_producto} ${product.marca} ${product.familia} ${product.grupo}`,
  );
  const match = productImages.find((image) => {
    const imageName = normalize(image.name);
    return imageName && (haystack.includes(imageName) || imageName.includes(name));
  });

  return (match || productImages[index % productImages.length])?.url || heroImage;
};

const availableOf = (product) =>
  Number(product.disponible ?? Number(product.stock || 0) - Number(product.comprometido || 0));

const stockBadge = (product) => {
  const available = availableOf(product);
  if (available <= 0) {
    return {
      label: 'Stock Agotado',
      cls: 'bg-rose-950 text-white border-rose-900',
    };
  }
  if (available <= 2) {
    return {
      label: 'Ultimos Disponibles',
      cls: 'bg-amber-100 text-amber-800 border-amber-200',
    };
  }
  return {
    label: 'Disponible',
    cls: 'bg-pink-50 text-pink-700 border-pink-100',
  };
};

const CatalogoCliente = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [selected, setSelected] = useState(null);
  const [request, setRequest] = useState({ cantidad: 1, fecha: todayISO() });
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [showReorder, setShowReorder] = useState(false);

  const { data: productosPrivados = [], isLoading } = useQuery({
    queryKey: ['catalogo-cliente'],
    queryFn: () => erpApi.get('/inventario').then((r) => r.data),
    enabled: Boolean(user),
    refetchInterval: 30000,
  });

  const productos = user ? productosPrivados : publicProducts;

  const brands = useMemo(
    () => [...new Set(productos.map((product) => product.marca).filter(Boolean))].sort(),
    [productos],
  );

  const filtered = useMemo(() => {
    const text = normalize(search);
    return productos.filter((product) => {
      const matchesText = !text || normalize(
        `${product.nombre_producto} ${product.marca} ${product.familia} ${product.genero} ${product.concentracion}`,
      ).includes(text);
      const matchesBrand = !brand || product.marca === brand;
      return matchesText && matchesBrand && product.active !== false;
    });
  }, [productos, search, brand]);

  const invalidateCatalog = () => {
    queryClient.invalidateQueries({ queryKey: ['catalogo-cliente'] });
    queryClient.invalidateQueries({ queryKey: ['inventario'] });
    queryClient.invalidateQueries({ queryKey: ['mis-reservas'] });
  };

  const reservaMutation = useMutation({
    mutationFn: (payload) => erpApi.post('/reservas', payload),
    onSuccess: () => {
      setNotice('Reserva creada correctamente. Puedes verla en Mis reservas.');
      setSelected(null);
      setActionError('');
      setShowReorder(false);
      invalidateCatalog();
    },
    onError: (error) => {
      setActionError(error.response?.data?.error || 'No se pudo crear la reserva.');
      setShowReorder(true);
    },
  });

  const reposicionMutation = useMutation({
    mutationFn: (payload) => erpApi.post('/reposiciones', payload),
    onSuccess: () => {
      setNotice('Solicitud anticipada enviada. El administrador podra revisar la reposicion.');
      setSelected(null);
      setActionError('');
      setShowReorder(false);
      invalidateCatalog();
    },
    onError: (error) => {
      setActionError(error.response?.data?.error || 'No se pudo crear la solicitud anticipada.');
    },
  });

  const openRequest = (product) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSelected(product);
    setRequest({ cantidad: 1, fecha: todayISO() });
    setActionError('');
    setShowReorder(false);
  };

  const handleReserve = () => {
    if (!selected) return;
    const quantity = Number(request.cantidad);
    const available = availableOf(selected);

    if (!quantity || quantity < 1) {
      setActionError('Indica una cantidad valida.');
      return;
    }

    if (available <= 0 || quantity > available) {
      setActionError('No hay disponible para este articulo. Puedes generar una solicitud anticipada.');
      setShowReorder(true);
      return;
    }

    reservaMutation.mutate({
      product_id: selected.product_id || selected.id,
      quantity,
      planning_date: request.fecha,
    });
  };

  const handleReorder = () => {
    if (!selected) return;
    const quantity = Number(request.cantidad);

    if (!quantity || quantity < 1) {
      setActionError('Indica una cantidad valida.');
      return;
    }

    reposicionMutation.mutate({
      product_id: selected.product_id || selected.id,
      quantity,
      needed_date: request.fecha,
      tipo_ingreso: 'SOLICITUD_CLIENTE',
      comment: `Solicitud anticipada para ${selected.nombre_producto}`,
    });
  };

  return (
    <div className="client-page">
      <section
        className="client-hero"
        style={{
          backgroundImage: `linear-gradient(105deg, rgba(72, 18, 46, 0.88), rgba(191, 87, 117, 0.72), rgba(245, 183, 76, 0.38)), url(${heroImage})`,
        }}
      >
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-100">Catalogo exclusivo</p>
          <h1 className="mt-4 text-4xl font-semibold text-white lg:text-5xl">
            Fragancias seleccionadas para reservar con anticipacion.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-rose-50">
            Explora el catalogo, elige tu producto favorito y solicita una reserva con fecha de entrega.
          </p>
        </div>
      </section>

      {!user && (
        <div className="mt-6 rounded-2xl border border-pink-100 bg-white/85 px-4 py-3 text-sm font-medium text-rose-800 shadow-sm">
          Inicia sesion o registrate para consultar disponibilidad en tiempo real y crear reservas.
        </div>
      )}

      {notice && (
        <div className="mt-6 rounded-2xl border border-pink-100 bg-white/85 px-4 py-3 text-sm font-medium text-rose-800 shadow-sm">
          {notice}
        </div>
      )}

      <section className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-rose-950">Productos disponibles</h2>
          <p className="mt-1 text-sm text-rose-500">{filtered.length} articulos en catalogo</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar perfume, marca o familia"
            className="client-input w-full sm:w-72"
          />
          <select value={brand} onChange={(event) => setBrand(event.target.value)} className="client-input">
            <option value="">Todas las marcas</option>
            {brands.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </section>

      {isLoading ? (
        <div className="mt-10 rounded-3xl bg-white/80 p-10 text-center text-sm text-rose-400 shadow-sm">
          Cargando catalogo...
        </div>
      ) : (
        <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product, index) => {
            const badge = stockBadge(product);
            const image = productImage(product, index);
            return (
              <article
                key={product.id}
                className="catalog-card group"
                style={{ animationDelay: `${Math.min(index * 45, 360)}ms` }}
              >
                <div className="relative h-56 overflow-hidden rounded-[1.35rem]">
                  <img
                    src={image}
                    alt={product.nombre_producto}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-rose-950/70 via-transparent to-transparent" />
                  <span className={`absolute left-4 top-4 rounded-full border px-3 py-1 text-xs font-bold ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <span className="absolute bottom-4 right-4 rounded-full bg-white/92 px-4 py-2 text-sm font-bold text-rose-900 shadow-lg">
                    {user ? formatCurrency(product.precio) : 'Catalogo'}
                  </span>
                </div>

                <div className="pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-rose-950">{product.nombre_producto}</h3>
                      <p className="mt-1 text-sm font-medium text-pink-500">{product.marca || 'Marly'}</p>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-rose-700/75">
                    {product.descripcion || 'Una fragancia creada para acompanar momentos especiales.'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[product.familia, product.genero, product.concentracion, product.volume && `${product.volume} ml`]
                      .filter(Boolean)
                      .map((tag) => (
                        <span key={tag} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                          {tag}
                        </span>
                      ))}
                  </div>

                  <button onClick={() => openRequest(product)} className="client-primary-button mt-5 w-full">
                    {user ? 'Reservar' : 'Iniciar sesion para reservar'}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-rose-950/45 p-4 backdrop-blur-sm">
          <div className="modal-pop w-full max-w-lg rounded-[1.75rem] bg-white p-5 shadow-2xl shadow-rose-950/20">
            <div className="flex gap-4">
              <img
                src={productImage(selected, 0)}
                alt={selected.nombre_producto}
                className="h-24 w-24 rounded-2xl object-cover"
              />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">{selected.marca}</p>
                <h3 className="mt-1 text-xl font-semibold text-rose-950">{selected.nombre_producto}</h3>
                <p className="mt-1 text-sm font-bold text-pink-600">{formatCurrency(selected.precio)}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-rose-700">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={request.cantidad}
                  onChange={(event) => setRequest({ ...request, cantidad: event.target.value })}
                  className="client-input w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-rose-700">Fecha solicitada</label>
                <input
                  type="date"
                  min={todayISO()}
                  value={request.fecha}
                  onChange={(event) => setRequest({ ...request, fecha: event.target.value })}
                  className="client-input w-full"
                />
              </div>
            </div>

            {actionError && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                {actionError}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleReserve}
                disabled={reservaMutation.isPending || reposicionMutation.isPending}
                className="client-primary-button flex-1 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reservaMutation.isPending ? 'Reservando...' : 'Confirmar reserva'}
              </button>
              {(showReorder || availableOf(selected) <= 0) && (
                <button
                  onClick={handleReorder}
                  disabled={reposicionMutation.isPending || reservaMutation.isPending}
                  className="client-secondary-button flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reposicionMutation.isPending ? 'Enviando...' : 'Generar solicitud anticipada'}
                </button>
              )}
            </div>

            <button
              onClick={() => setSelected(null)}
              className="mt-3 w-full rounded-2xl px-4 py-2 text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogoCliente;
