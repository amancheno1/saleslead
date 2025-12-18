import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit2, Building2, Key, Users } from 'lucide-react';
import InvitationCodes from './InvitationCodes';
import ProjectMembers from './ProjectMembers';
import { useProject } from '../context/ProjectContext';

interface Project {
  id: string;
  name: string;
  description: string | null;
  weekly_goal: number;
  user_id: string;
  created_at: string;
}

type AdminTab = 'projects' | 'invitations' | 'members';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('projects');

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    weekly_goal: 50
  });

  useEffect(() => {
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading projects:', error);
        return;
      }

      setProjects(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const { error } = await supabase
      .from('projects')
      .insert({
        name: newProject.name,
        description: newProject.description,
        weekly_goal: newProject.weekly_goal,
        user_id: user.id
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
        weekly_goal: editingProject.weekly_goal
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
        <p className="text-gray-600">Gestiona proyectos, miembros y códigos de invitación</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'projects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Building2 size={20} />
              Proyectos
            </button>
            {currentProject && (
              <>
                <button
                  onClick={() => setActiveTab('invitations')}
                  className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'invitations'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Key size={20} />
                  Códigos de Invitación
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'members'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users size={20} />
                  Miembros
                </button>
              </>
            )}
          </nav>
        </div>
      </div>

      {activeTab === 'projects' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
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
                      <Building2 className="text-blue-600" size={24} />
                      <h3 className="text-lg font-bold text-gray-900">{project.name}</h3>
                    </div>
                    {project.description && (
                      <p className="text-gray-600 mt-1 ml-9">{project.description}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-2 ml-9">
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

      {activeTab === 'invitations' && currentProject && (
        <InvitationCodes />
      )}

      {activeTab === 'members' && currentProject && (
        <ProjectMembers />
      )}

      {!currentProject && activeTab !== 'projects' && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <Building2 className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Selecciona un Proyecto</h3>
          <p className="text-gray-600">Primero debes seleccionar un proyecto para gestionar sus miembros y códigos de invitación</p>
        </div>
      )}
    </div>
  );
}
