export default function Auth({ email, setEmail, password, setPassword, handleAuth, message }) {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white">
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">FLASHCARDX</h2>
          <p className="text-slate-500 mb-8 font-medium italic">Tu modelo de palabras inteligente.</p>

          <div className="space-y-4">
            <input type="email" placeholder="Email" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Contraseña" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setPassword(e.target.value)} />
            
            {message.text && (
              <div className={`p-4 rounded-xl text-sm font-bold ${message.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                {message.text}
              </div>
            )}

            <button onClick={() => handleAuth('login')} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:shadow-lg transition-all active:scale-95">Iniciar Sesión</button>
            <button onClick={() => handleAuth('register')} className="w-full bg-white text-slate-900 border border-slate-200 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95">Registrarse</button>
          </div>
        </div>
      </div>
      <div className="hidden md:flex w-1/2 bg-blue-600 items-center justify-center relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-900 opacity-90"></div>
         <div className="relative z-10 text-white p-12 text-center">
            <h3 className="text-4xl font-bold mb-4 italic">FlashcardX</h3>
            <p className="text-blue-100 opacity-80 leading-relaxed">
              Diseñado por Manchax<br/>
              Basado en ANKI
            </p>
         </div>
      </div>
    </div>
  );
}