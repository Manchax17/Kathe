import { useNavigate } from 'react-router';
import SettingsModal from '../components/SettingsModal';

/**
 * Ajustes como ruta (`/ajustes`), no como estado local.
 *
 * Así el enlace del header y el botón "Editar perfil" de tu propio perfil llevan
 * al mismo lugar, y la URL se puede compartir o recargar.
 */
export default function SettingsPage() {
  const navigate = useNavigate();

  const close = () => {
    // Si hay historial, volvemos atrás; si entraron directo, vamos al inicio.
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  return <SettingsModal open onClose={close} />;
}
