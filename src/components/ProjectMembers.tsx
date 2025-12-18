import { useState, useEffect } from 'react';
import { Users, Shield, UserMinus, Crown, User, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProject } from '../context/ProjectContext';
import type { Database } from '../lib/database.types';

type ProjectMember = Database['public']['Tables']['project_members']['Row'] & {
  user_email?: string;
};

export default function ProjectMembers() {
  const { currentProject } = useProject();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    getCurrentUser();
    if (currentProject) {
      fetchMembers();
    }
  }, [currentProject]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

    if (user && currentProject) {
      const { data: memberData } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', currentProject.id)
        .eq('user_id', user.id)
        .maybeSingle();

      setCurrentUserRole(memberData?.role || null);
    }
  };

  const fetchMembers = async () => {
    if (!currentProject) return;

    try {
      const { data, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      const membersWithEmails = await Promise.all(
        (data || []).map(async (member) => {
          const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
          return {
            ...member,
            user_email: userData.user?.email || member.email || 'Email no disponible'
          };
        })
      );

      setMembers(membersWithEmails);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: 'admin' | 'member' | 'owner') => {
    if (!confirm(`¿Cambiar el rol de este miembro a ${newRole === 'owner' ? 'Propietario' : newRole === 'admin' ? 'Administrador' : 'Miembro'}?`)) return;

    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      fetchMembers();
    } catch (error: any) {
      alert('Error al actualizar rol: ' + error.message);
    }
  };

  const handleEditProfile = (member: ProjectMember) => {
    setEditingMember(member);
    setNewEmail(member.user_email || '');
  };

  const handleUpdateEmail = async () => {
    if (!editingMember || !newEmail) return;

    if (!confirm('¿Estás seguro de que quieres actualizar el email de este usuario?')) return;

    try {
      const { error } = await supabase
        .from('project_members')
        .update({ email: newEmail })
        .eq('id', editingMember.id);

      if (error) throw error;

      alert('Email actualizado. El usuario deberá iniciar sesión con el nuevo email.');
      setEditingMember(null);
      setNewEmail('');
      fetchMembers();
    } catch (error: any) {
      alert('Error al actualizar email: ' + error.message);
    }
  };

  const handleRemoveMember = async (memberId: string, memberRole: string) => {
    if (memberRole === 'owner') {
      alert('No puedes eliminar al propietario del proyecto');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar a este miembro del proyecto?')) return;

    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      fetchMembers();
    } catch (error: any) {
      alert('Error al eliminar miembro: ' + error.message);
    }
  };

  const handleDeleteUserAccount = async (userId: string, memberRole: string) => {
    if (memberRole === 'owner') {
      alert('No puedes eliminar la cuenta del propietario');
      return;
    }

    if (userId === currentUserId) {
      alert('No puedes eliminar tu propia cuenta desde aquí');
      return;
    }

    if (!confirm('⚠️ ADVERTENCIA: Esto eliminará permanentemente la cuenta del usuario y todos sus datos. ¿Estás seguro?')) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      alert('Cuenta de usuario eliminada permanentemente');
      fetchMembers();
    } catch (error: any) {
      alert('Error al eliminar cuenta: ' + error.message);
    }
  };

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Cargando miembros...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Miembros del Proyecto</h2>
            <p className="text-green-100">Gestiona quién tiene acceso a este proyecto</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{members.length}</div>
            <div className="text-sm text-green-100">
              {members.length === 1 ? 'Miembro' : 'Miembros'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">No hay miembros en este proyecto</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de Unión
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => {
                  const isOwner = member.role === 'owner';
                  const isCurrentUser = member.user_id === currentUserId;

                  return (
                    <tr key={member.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <User className="text-white" size={20} />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              {member.user_email}
                              {isCurrentUser && (
                                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                                  Tú
                                </span>
                              )}
                              {isOwner && (
                                <Crown className="text-yellow-500" size={16} title="Propietario" />
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {member.role === 'owner' ? (
                            <>
                              <Crown className="text-yellow-500" size={18} />
                              <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">
                                Propietario
                              </span>
                            </>
                          ) : member.role === 'admin' ? (
                            <>
                              <Shield className="text-blue-600" size={18} />
                              <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                                Administrador
                              </span>
                            </>
                          ) : (
                            <>
                              <User className="text-gray-600" size={18} />
                              <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded">
                                Miembro
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(member.joined_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {canManageMembers && !isOwner && (
                          <div className="flex flex-wrap items-center gap-2">
                            {member.role === 'member' ? (
                              <button
                                onClick={() => handleUpdateRole(member.id, 'admin')}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors font-medium text-xs flex items-center gap-1"
                              >
                                <Shield size={14} />
                                Promover
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateRole(member.id, 'member')}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-medium text-xs flex items-center gap-1"
                              >
                                <User size={14} />
                                Degradar
                              </button>
                            )}
                            <button
                              onClick={() => handleEditProfile(member)}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors font-medium text-xs flex items-center gap-1"
                            >
                              <Edit2 size={14} />
                              Editar
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member.id, member.role)}
                              className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors font-medium text-xs flex items-center gap-1"
                            >
                              <UserMinus size={14} />
                              Quitar
                            </button>
                            <button
                              onClick={() => handleDeleteUserAccount(member.user_id, member.role)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors font-medium text-xs flex items-center gap-1"
                            >
                              <Trash2 size={14} />
                              Borrar
                            </button>
                          </div>
                        )}
                        {canManageMembers && isOwner && (
                          <button
                            onClick={() => handleEditProfile(member)}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors font-medium text-xs flex items-center gap-1"
                          >
                            <Edit2 size={14} />
                            Editar
                          </button>
                        )}
                        {!canManageMembers && (
                          <span className="text-gray-500 text-xs italic">Sin permisos</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Editar Perfil</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="nuevo@email.com"
                />
              </div>
              <p className="text-sm text-gray-600">
                Nota: El cambio de email requerirá que el usuario inicie sesión nuevamente.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleUpdateEmail}
                  className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Actualizar
                </button>
                <button
                  onClick={() => {
                    setEditingMember(null);
                    setNewEmail('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Roles y Permisos</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <Crown className="text-yellow-600 mt-0.5" size={16} />
            <div>
              <strong>Propietario:</strong> Creador del proyecto con control total. No puede ser eliminado ni degradado.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="text-blue-600 mt-0.5" size={16} />
            <div>
              <strong>Administrador:</strong> Puede gestionar miembros, crear códigos de invitación y todas las funciones excepto eliminar el proyecto.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="text-gray-600 mt-0.5" size={16} />
            <div>
              <strong>Miembro:</strong> Puede ver y gestionar leads, pero no puede invitar nuevos miembros ni cambiar configuraciones.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
