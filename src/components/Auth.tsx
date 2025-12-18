import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Mail, Lock, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AuthView = 'login' | 'signup' | 'forgot-password';

export default function Auth() {
  const [currentView, setCurrentView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (currentView === 'login') {
        await signIn(email, password);
      } else if (currentView === 'signup') {
        await signUp(email, password);
        alert('Cuenta creada exitosamente. Por favor inicia sesión.');
        setCurrentView('login');
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setResetEmailSent(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      });

      if (error) throw error;

      setResetEmailSent(true);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Error al enviar el email de recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {currentView === 'forgot-password' && (
            <button
              onClick={() => {
                setCurrentView('login');
                setError('');
                setResetEmailSent(false);
              }}
              className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold transition-colors group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              Volver al login
            </button>
          )}

          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-lg opacity-75"></div>
              <div className="relative p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-xl">
                {currentView === 'login' && <LogIn className="text-white" size={36} />}
                {currentView === 'signup' && <UserPlus className="text-white" size={36} />}
                {currentView === 'forgot-password' && <Send className="text-white" size={36} />}
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-black text-center text-gray-900 mb-2 tracking-tight">
            Lead Tracker
          </h1>
          <p className="text-center text-gray-600 font-semibold mb-8">
            {currentView === 'login' && 'Inicia sesión en tu cuenta'}
            {currentView === 'signup' && 'Crea una nueva cuenta'}
            {currentView === 'forgot-password' && 'Recupera tu contraseña'}
          </p>

          {currentView === 'forgot-password' ? (
            <>
              {resetEmailSent ? (
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4 shadow-xl">
                    <CheckCircle className="text-white" size={48} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-3">Email Enviado</h3>
                  <p className="text-gray-600 font-medium mb-6">
                    Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
                  </p>
                  <button
                    onClick={() => {
                      setCurrentView('login');
                      setResetEmailSent(false);
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/50 transition-all hover:scale-105"
                  >
                    Volver al Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={22} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                        placeholder="tu@email.com"
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Te enviaremos un link para restablecer tu contraseña
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl">
                      <p className="text-sm text-red-600 font-semibold">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-black text-lg hover:shadow-2xl hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                  >
                    {loading ? 'Enviando...' : 'Enviar Email de Recuperación'}
                  </button>
                </form>
              )}
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={22} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Contraseña
                  </label>
                  {currentView === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView('forgot-password');
                        setError('');
                      }}
                      className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={22} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl">
                  <p className="text-sm text-red-600 font-semibold">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-black text-lg hover:shadow-2xl hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
              >
                {loading ? 'Procesando...' : currentView === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </button>
            </form>
          )}

          {currentView !== 'forgot-password' && (
            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setCurrentView(currentView === 'login' ? 'signup' : 'login');
                  setError('');
                }}
                className="text-blue-600 hover:text-blue-700 font-bold transition-colors"
              >
                {currentView === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-white text-sm mt-6 font-semibold drop-shadow-lg">
          Gestiona tus leads de manera profesional
        </p>
      </div>
    </div>
  );
}
