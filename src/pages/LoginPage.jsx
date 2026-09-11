import { useState } from 'react';
import { Navigate } from 'react-router';
import Auth from '../components/Auth';
import Splash from '../components/Splash';
import { useAuth } from '../hooks/useAuth';
import { validateUsername } from '../utils/username';

export default function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  if (loading) return <Splash />;
  if (user) return <Navigate to="/" replace />;

  const handleAuth = async (type) => {
    if (!email || !password) {
      setMessage({ text: 'Completá email y contraseña.', type: 'error' });
      return;
    }

    if (type === 'register') {
      const invalid = validateUsername(username);
      if (invalid) {
        setMessage({ text: invalid, type: 'error' });
        return;
      }
    }

    setMessage({ text: '', type: '' });

    const result =
      type === 'login'
        ? await signIn(email, password)
        : await signUp(email, password, username);

    if (result.error) {
      setMessage({ text: result.error.message, type: 'error' });
      return;
    }

    // Si el proyecto tiene la confirmación por email activada, acá no hay sesión:
    // el usuario entra cuando confirme. Antes esto logueaba igual y dejaba la
    // app en blanco porque RLS bloqueaba todo.
    if (result.needsConfirmation) {
      setMessage({
        text: 'Cuenta creada. Revisá tu email para confirmarla antes de entrar.',
        type: 'success',
      });
    }
  };

  return (
    <Auth
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      username={username}
      setUsername={setUsername}
      handleAuth={handleAuth}
      message={message}
    />
  );
}
