import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { setupSuperAdmin } from '../lib/adminSetup';
import { Shield, Check, X } from 'lucide-react';

export default function SuperAdminSetup() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSetup = async () => {
    if (!user?.email) {
      setResult({ success: false, message: 'No user email found' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await setupSuperAdmin(user.email);
      setResult(response);

      if (response.success) {
        setTimeout(async () => {
          await refreshProfile();
          window.location.href = '/';
        }, 2000);
      }
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <p className="text-gray-600">Please log in first</p>
        </div>
      </div>
    );
  }

  if (profile?.role === 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Check className="text-green-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Already Super Admin</h2>
          <p className="text-gray-600 mb-6">Your account already has super admin privileges</p>
          <a
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="text-blue-600" size={32} />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Super Admin Setup
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Promote your account to Super Administrator
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 font-semibold mb-2">Current Account:</p>
          <p className="text-sm text-blue-800">{user.email}</p>
          <p className="text-sm text-blue-700 mt-2">Role: {profile?.role || 'member'}</p>
        </div>

        {result && (
          <div className={`p-4 rounded-lg mb-6 ${
            result.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <Check className="text-green-600" size={20} />
              ) : (
                <X className="text-red-600" size={20} />
              )}
              <p className={`text-sm font-semibold ${
                result.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {result.message}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleSetup}
          disabled={loading || profile?.role === 'super_admin'}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Promote to Super Admin'}
        </button>

        <p className="text-sm text-gray-500 text-center mt-4">
          This will grant you full administrative access to the system
        </p>
      </div>
    </div>
  );
}
