import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, ToggleLeft, ToggleRight, Copy, Check, Calendar, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProject } from '../context/ProjectContext';
import type { Database } from '../lib/database.types';

type InvitationCode = Database['public']['Tables']['invitation_codes']['Row'];

export default function InvitationCodes() {
  const { currentProject } = useProject();
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [newCode, setNewCode] = useState({
    code: '',
    maxUses: '',
    expiresAt: ''
  });

  useEffect(() => {
    if (currentProject) {
      fetchCodes();
    }
  }, [currentProject]);

  const fetchCodes = async () => {
    if (!currentProject) return;

    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error fetching codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;

    try {
      const codeToCreate = newCode.code || generateRandomCode();

      const { error } = await supabase
        .from('invitation_codes')
        .insert({
          project_id: currentProject.id,
          code: codeToCreate,
          created_by: (await supabase.auth.getUser()).data.user?.id!,
          max_uses: newCode.maxUses ? parseInt(newCode.maxUses) : null,
          expires_at: newCode.expiresAt || null
        });

      if (error) throw error;

      setNewCode({ code: '', maxUses: '', expiresAt: '' });
      setShowCreateForm(false);
      fetchCodes();
    } catch (error: any) {
      alert('Error al crear código: ' + error.message);
    }
  };

  const handleToggleActive = async (code: InvitationCode) => {
    try {
      const { error } = await supabase
        .from('invitation_codes')
        .update({ is_active: !code.is_active })
        .eq('id', code.id);

      if (error) throw error;
      fetchCodes();
    } catch (error: any) {
      alert('Error al actualizar código: ' + error.message);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este código?')) return;

    try {
      const { error } = await supabase
        .from('invitation_codes')
        .delete()
        .eq('id', codeId);

      if (error) throw error;
      fetchCodes();
    } catch (error: any) {
      alert('Error al eliminar código: ' + error.message);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isMaxUsesReached = (code: InvitationCode) => {
    if (!code.max_uses) return false;
    return code.uses_count >= code.max_uses;
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Cargando códigos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Códigos de Invitación</h2>
            <p className="text-blue-100">Gestiona el acceso a tu proyecto</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            Nuevo Código
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Crear Nuevo Código</h3>
          <form onSubmit={handleCreateCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código
                <span className="text-gray-500 text-xs ml-2">(Dejar vacío para generar automáticamente)</span>
              </label>
              <input
                type="text"
                value={newCode.code}
                onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: PROYECTO2024"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo de Usos
                  <span className="text-gray-500 text-xs ml-2">(Opcional)</span>
                </label>
                <input
                  type="number"
                  value={newCode.maxUses}
                  onChange={(e) => setNewCode({ ...newCode, maxUses: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ilimitado"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Expiración
                  <span className="text-gray-500 text-xs ml-2">(Opcional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={newCode.expiresAt}
                  onChange={(e) => setNewCode({ ...newCode, expiresAt: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Crear Código
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewCode({ code: '', maxUses: '', expiresAt: '' });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {codes.length === 0 ? (
          <div className="text-center py-12">
            <Key className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">No hay códigos de invitación</p>
            <p className="text-sm text-gray-500 mt-2">Crea un código para invitar miembros a tu proyecto</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expira
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {codes.map((code) => {
                  const expired = isExpired(code.expires_at);
                  const maxReached = isMaxUsesReached(code);
                  const inactive = !code.is_active || expired || maxReached;

                  return (
                    <tr key={code.id} className={inactive ? 'bg-gray-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <code className="px-3 py-1 bg-gray-100 text-gray-900 rounded font-mono text-sm font-bold">
                            {code.code}
                          </code>
                          <button
                            onClick={() => handleCopyCode(code.code)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Copiar código"
                          >
                            {copiedCode === code.code ? (
                              <Check size={16} className="text-green-600" />
                            ) : (
                              <Copy size={16} className="text-gray-600" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {inactive ? (
                          <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                            {expired ? 'Expirado' : maxReached ? 'Límite alcanzado' : 'Inactivo'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">
                            Activo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-gray-400" />
                          {code.uses_count} {code.max_uses ? `/ ${code.max_uses}` : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {code.expires_at ? (
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-gray-400" />
                            {new Date(code.expires_at).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-gray-500">Sin expiración</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(code)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title={code.is_active ? 'Desactivar' : 'Activar'}
                          >
                            {code.is_active ? (
                              <ToggleRight size={20} className="text-green-600" />
                            ) : (
                              <ToggleLeft size={20} className="text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteCode(code.id)}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
