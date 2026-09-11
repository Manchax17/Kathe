import { createContext } from 'react';

// Va en archivo aparte porque `react-refresh/only-export-components` exige que
// los archivos con componentes no exporten nada más.
export const AuthContext = createContext(null);
