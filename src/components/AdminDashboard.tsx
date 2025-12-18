import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit2, Users, Key, Copy, Check, Settings as SettingsIcon, Building2, BarChart3, TrendingUp, Target, DollarSign } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  weekly_goal: number;
  is_active: boolean;
  owner_id: string;
  created_at: string;
}

interface ProjectMember {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  project_id: string | null;
  created_at: string;
}

interface Invitation {
  id: string;
  invitation_code: string;
  role: string;
  expires_at: string;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  project_name?: string;
}

interface ProjectStats {
  project_id: string;
  project_name: string;
  total_leads: number;
  pending_leads: number;
  contacted_leads: number;
  converted_leads: number;
  total_revenue: number;
  members_count: number;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'statistics' | 'projects' | 'members' | 'invitations'>('statistics');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateInvitation, setShowCreateInvitation] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    weekly_goal: 50
  });

  const [newInvitation, setNewInvitation] = useState({
    project_id: '',
    role: 'member' as 'member' | 'project_admin',
    max_uses: 10,
    days_valid: 7
  });

  useEffect(() => {
    loadData();
  }, [profile, activeTab]);

  const loadData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      if (activeTab === 'statistics') {
        await loadStatistics();
      } else if (activeTab === 'projects') {
        await loadProjects();
      } else if (activeTab === 'members') {
        await loadMembers();
      } else if (activeTab === 'invitations') {
        await loadInvitations();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    if (profile?.role !== 'super_admin') return;

    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, name')
      .eq('is_active', true);

    if (!projectsData) return;

    const stats: ProjectStats[] = [];

    for (const project of projectsData) {
      const { data: leads } = await supabase
        .from('leads')
        .select('status, sale_amount, first_installment_amount')
        .eq('project_id', project.id);

      const { count: membersCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id);

      const totalLeads = leads?.length || 0;
      const pendingLeads = leads?.filter(l => l.status === 'pending').length || 0;
      const contactedLeads = leads?.filter(l => l.status === 'contacted').length || 0;
      const convertedLeads = leads?.filter(l => l.status === 'converted').length || 0;
      const totalRevenue = leads?.reduce((sum, l) => {
        const saleAmount = parseFloat(l.sale_amount || '0');
        const firstInstallment = parseFloat(l.first_installment_amount || '0');
        return sum + saleAmount + firstInstallment;
      }, 0) || 0;

      stats.push({
        project_id: project.id,
        project_name: project.name,
        total_leads: totalLeads,
        pending_leads: pendingLeads,
        contacted_leads: contactedLeads,
        converted_leads: convertedLeads,
        total_revenue: totalRevenue,
        members_count: membersCount || 0
      });
    }

    setProjectStats(stats);
  };

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading projects:', error);
      return;
    }

    setProjects(data || []);
  };

  const loadMembers = async () => {
    if (profile?.role === 'super_admin') {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) setMembers(data || []);
    } else if (profile?.project_id) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('project_id', profile.project_id)
        .order('created_at', { ascending: false });

      if (!error) setMembers(data || []);
    }
  };

  const loadInvitations = async () => {
    const query = supabase
      .from('project_invitations')
      .select(`
        *,
        projects (name)
      `)
      .order('created_at', { ascending: false });

    if (profile?.role === 'project_admin' && profile.project_id) {
      query.eq('project_id', profile.project_id);
    }

    const { data, error } = await query;

    if (!error) {
      setInvitations(data?.map(inv => ({
        ...inv,
        project_name: (inv as any).projects?.name
      })) || []);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    const { error } = await supabase
      .from('projects')
      .insert({
        name: newProject.name,
        description: newProject.description,
        weekly_goal: newProject.weekly_goal,
        user_id: profile.id,
        owner_id: profile.id,
        is_active: true
      });

    if (error) {
      alert('Error al crear proyecto: ' + error.message);
      return;
    }

    setNewProject({ name: '', description: '', weekly_goal: 50 });
    setShowCreateProject(false);
    loadProjects();
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    const { error } = await supabase
      .from('projects')
      .update({
        name: editingProject.name,
        description: editingProject.description,
        weekly_goal: editingProject.weekly_goal,
        is_active: editingProject.is_active
      })
      .eq('id', editingProject.id);

    if (error) {
      alert('Error al actualizar proyecto: ' + error.message);
      return;
    }

    setEditingProject(null);
    loadProjects();
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('¿Estás seguro de eliminar este proyecto? Se eliminarán todos los datos asociados.')) {
      return;
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      alert('Error al eliminar proyecto: ' + error.message);
      return;
    }

    loadProjects();
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    const projectId = profile.role === 'super_admin' ? newInvitation.project_id : profile.project_id;

    if (!projectId) {
      alert('Selecciona un proyecto');
      return;
    }

    const { data: codeData } = await supabase.rpc('generate_invitation_code');
    const code = codeData || Math.random().toString(36).substring(2, 10).toUpperCase();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + newInvitation.days_valid);

    const { error } = await supabase
      .from('project_invitations')
      .insert({
        project_id: projectId,
        invitation_code: code,
        role: newInvitation.role,
        created_by: profile.id,
        expires_at: expiresAt.toISOString(),
        max_uses: newInvitation.max_uses,
        is_active: true
      });

    if (error) {
      alert('Error al crear invitación: ' + error.message);
      return;
    }

    setNewInvitation({ project_id: '', role: 'member', max_uses: 10, days_valid: 7 });
    setShowCreateInvitation(false);
    loadInvitations();
  };

  const handleToggleInvitation = async (invitationId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('project_invitations')
      .update({ is_active: !isActive })
      .eq('id', invitationId);

    if (error) {
      alert('Error al actualizar invitación: ' + error.message);
      return;
    }

    loadInvitations();
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        role: editingMember.role,
        project_id: editingMember.project_id,
        full_name: editingMember.full_name
      })
      .eq('id', editingMember.id);

    if (error) {
      alert('Error al actualizar usuario: ' + error.message);
      return;
    }

    setEditingMember(null);
    loadMembers();
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', memberId);

    if (error) {
      alert('Error al eliminar usuario: ' + error.message);
      return;
    }

    loadMembers();
  };

  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'project_admin')) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800 font-semibold">No tienes permisos para acceder a esta sección</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
        <p className="text-gray-600">Gestiona proyectos, usuarios y códigos de invitación</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {profile?.role === 'super_admin' && (
              <button
                onClick={() => setActiveTab('statistics')}
                className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
                  activeTab === 'statistics'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <BarChart3 className="inline-block mr-2" size={18} />
                Estadísticas
              </button>
            )}
            <button
              onClick={() => setActiveTab('projects')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
                activeTab === 'projects'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Building2 className="inline-block mr-2" size={18} />
              Proyectos
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
                activeTab === 'members'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="inline-block mr-2" size={18} />
              Usuarios
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
                activeTab === 'invitations'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Key className="inline-block mr-2" size={18} />
              Invitaciones
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'statistics' && profile?.role === 'super_admin' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Estadísticas Globales</h2>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100 text-sm font-semibold mb-1">Total Proyectos</p>
                          <p className="text-3xl font-bold">{projectStats.length}</p>
                        </div>
                        <Building2 size={36} className="opacity-80" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100 text-sm font-semibold mb-1">Total Leads</p>
                          <p className="text-3xl font-bold">
                            {projectStats.reduce((sum, p) => sum + p.total_leads, 0)}
                          </p>
                        </div>
                        <TrendingUp size={36} className="opacity-80" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100 text-sm font-semibold mb-1">Convertidos</p>
                          <p className="text-3xl font-bold">
                            {projectStats.reduce((sum, p) => sum + p.converted_leads, 0)}
                          </p>
                        </div>
                        <Target size={36} className="opacity-80" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-100 text-sm font-semibold mb-1">Ingresos Totales</p>
                          <p className="text-3xl font-bold">
                            ${projectStats.reduce((sum, p) => sum + p.total_revenue, 0).toLocaleString()}
                          </p>
                        </div>
                        <DollarSign size={36} className="opacity-80" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {projectStats.map((stat) => (
                      <div key={stat.project_id} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">{stat.project_name}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600 font-semibold mb-1">Total Leads</p>
                            <p className="text-2xl font-bold text-gray-900">{stat.total_leads}</p>
                          </div>
                          <div className="bg-yellow-50 rounded-lg p-4">
                            <p className="text-sm text-yellow-700 font-semibold mb-1">Pendientes</p>
                            <p className="text-2xl font-bold text-yellow-900">{stat.pending_leads}</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-sm text-blue-700 font-semibold mb-1">Contactados</p>
                            <p className="text-2xl font-bold text-blue-900">{stat.contacted_leads}</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4">
                            <p className="text-sm text-green-700 font-semibold mb-1">Convertidos</p>
                            <p className="text-2xl font-bold text-green-900">{stat.converted_leads}</p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-4">
                            <p className="text-sm text-purple-700 font-semibold mb-1">Usuarios</p>
                            <p className="text-2xl font-bold text-purple-900">{stat.members_count}</p>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-4">
                            <p className="text-sm text-orange-700 font-semibold mb-1">Ingresos</p>
                            <p className="text-2xl font-bold text-orange-900">${stat.total_revenue.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'projects' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Proyectos</h2>
                <button
                  onClick={() => setShowCreateProject(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
                >
                  <Plus size={20} />
                  Nuevo Proyecto
                </button>
              </div>

              {showCreateProject && (
                <form onSubmit={handleCreateProject} className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Crear Nuevo Proyecto</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre</label>
                      <input
                        type="text"
                        required
                        value={newProject.name}
                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                      <textarea
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Semanal de Leads</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newProject.weekly_goal}
                        onChange={(e) => setNewProject({ ...newProject, weekly_goal: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                      >
                        Crear
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateProject(false)}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {editingProject && (
                <form onSubmit={handleUpdateProject} className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Editar Proyecto</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre</label>
                      <input
                        type="text"
                        required
                        value={editingProject.name}
                        onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                      <textarea
                        value={editingProject.description || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Semanal de Leads</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={editingProject.weekly_goal}
                        onChange={(e) => setEditingProject({ ...editingProject, weekly_goal: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={editingProject.is_active}
                        onChange={(e) => setEditingProject({ ...editingProject, is_active: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="is_active" className="ml-2 text-sm font-semibold text-gray-700">
                        Proyecto Activo
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProject(null)}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : projects.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No hay proyectos</p>
                ) : (
                  projects.map((project) => (
                    <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900">{project.name}</h3>
                            {!project.is_active && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                                Inactivo
                              </span>
                            )}
                          </div>
                          {project.description && (
                            <p className="text-gray-600 mt-1">{project.description}</p>
                          )}
                          <p className="text-sm text-gray-500 mt-2">
                            Meta semanal: {project.weekly_goal} leads
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingProject(project)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Gestión de Usuarios</h2>

              {editingMember && (
                <form onSubmit={handleUpdateMember} className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Editar Usuario</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={editingMember.email}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre Completo</label>
                      <input
                        type="text"
                        value={editingMember.full_name || ''}
                        onChange={(e) => setEditingMember({ ...editingMember, full_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {profile?.role === 'super_admin' && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Rol</label>
                          <select
                            value={editingMember.role}
                            onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="member">Miembro</option>
                            <option value="project_admin">Admin Proyecto</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Proyecto Asignado</label>
                          <select
                            value={editingMember.project_id || ''}
                            onChange={(e) => setEditingMember({ ...editingMember, project_id: e.target.value || null })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            disabled={editingMember.role === 'super_admin'}
                          >
                            <option value="">Sin proyecto</option>
                            {projects.filter(p => p.is_active).map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                          {editingMember.role === 'super_admin' && (
                            <p className="text-sm text-gray-600 mt-1">Los super admins no necesitan proyecto asignado</p>
                          )}
                        </div>
                      </>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingMember(null)}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Rol</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Proyecto</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fecha</th>
                      {profile?.role === 'super_admin' && (
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={profile?.role === 'super_admin' ? 6 : 5} className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </td>
                      </tr>
                    ) : members.length === 0 ? (
                      <tr>
                        <td colSpan={profile?.role === 'super_admin' ? 6 : 5} className="text-center py-8 text-gray-500">
                          No hay usuarios
                        </td>
                      </tr>
                    ) : (
                      members.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm text-gray-900">{member.email}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{member.full_name || '-'}</td>
                          <td className="px-4 py-4 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              member.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                              member.role === 'project_admin' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {member.role === 'super_admin' ? 'Super Admin' :
                               member.role === 'project_admin' ? 'Admin Proyecto' : 'Miembro'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {member.project_id ? projects.find(p => p.id === member.project_id)?.name || '-' : '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {new Date(member.created_at).toLocaleDateString()}
                          </td>
                          {profile?.role === 'super_admin' && (
                            <td className="px-4 py-4 text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingMember(member);
                                    loadProjects();
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 size={16} />
                                </button>
                                {member.id !== profile.id && (
                                  <button
                                    onClick={() => handleDeleteMember(member.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'invitations' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Códigos de Invitación</h2>
                <button
                  onClick={() => setShowCreateInvitation(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
                >
                  <Plus size={20} />
                  Nueva Invitación
                </button>
              </div>

              {showCreateInvitation && (
                <form onSubmit={handleCreateInvitation} className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Crear Código de Invitación</h3>
                  <div className="space-y-4">
                    {profile?.role === 'super_admin' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Proyecto</label>
                        <select
                          required
                          value={newInvitation.project_id}
                          onChange={(e) => setNewInvitation({ ...newInvitation, project_id: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selecciona un proyecto</option>
                          {projects.filter(p => p.is_active).map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Rol</label>
                      <select
                        value={newInvitation.role}
                        onChange={(e) => setNewInvitation({ ...newInvitation, role: e.target.value as 'member' | 'project_admin' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="member">Miembro</option>
                        <option value="project_admin">Admin Proyecto</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Máximo de Usos</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newInvitation.max_uses}
                        onChange={(e) => setNewInvitation({ ...newInvitation, max_uses: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Días de Validez</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newInvitation.days_valid}
                        onChange={(e) => setNewInvitation({ ...newInvitation, days_valid: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                      >
                        Crear
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateInvitation(false)}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : invitations.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No hay códigos de invitación</p>
                ) : (
                  invitations.map((invitation) => (
                    <div key={invitation.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <code className="text-2xl font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded">
                              {invitation.invitation_code}
                            </code>
                            <button
                              onClick={() => copyToClipboard(invitation.invitation_code)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Copiar código"
                            >
                              {copiedCode === invitation.invitation_code ? (
                                <Check size={18} className="text-green-600" />
                              ) : (
                                <Copy size={18} />
                              )}
                            </button>
                            {!invitation.is_active && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                                Desactivado
                              </span>
                            )}
                            {new Date(invitation.expires_at) < new Date() && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                                Expirado
                              </span>
                            )}
                          </div>
                          {invitation.project_name && (
                            <p className="text-sm text-gray-600">Proyecto: <span className="font-semibold">{invitation.project_name}</span></p>
                          )}
                          <p className="text-sm text-gray-600">
                            Rol: <span className="font-semibold">
                              {invitation.role === 'project_admin' ? 'Admin Proyecto' : 'Miembro'}
                            </span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Usos: {invitation.current_uses} / {invitation.max_uses || '∞'}
                          </p>
                          <p className="text-sm text-gray-500">
                            Expira: {new Date(invitation.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggleInvitation(invitation.id, invitation.is_active)}
                          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                            invitation.is_active
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {invitation.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
