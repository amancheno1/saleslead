import { useState } from 'react';
import { Folder, Plus, ChevronDown, X } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

export default function ProjectSelector() {
  const { currentProject, projects, setCurrentProject, createProject } = useProject();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectGoal, setNewProjectGoal] = useState(50);
  const [loading, setLoading] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createProject(newProjectName, newProjectDescription, newProjectGoal);
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectGoal(50);
      setShowNewProject(false);
      setShowDropdown(false);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error al crear el proyecto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full md:w-auto"
      >
        <Folder size={18} className="text-blue-600" />
        <span className="font-medium text-gray-900 truncate max-w-[150px]">
          {currentProject ? currentProject.name : 'Seleccionar Proyecto'}
        </span>
        <ChevronDown size={18} className="text-gray-600" />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute top-full left-0 right-0 md:left-auto md:right-auto md:w-80 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            <div className="p-2">
              <button
                onClick={() => {
                  setShowNewProject(true);
                  setShowDropdown(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus size={18} />
                <span className="font-medium">Crear Nuevo Proyecto</span>
              </button>

              <div className="border-t border-gray-200 my-2" />

              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    setCurrentProject(project);
                    setShowDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    currentProject?.id === project.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-50 text-gray-900'
                  }`}
                >
                  <div className="font-medium">{project.name}</div>
                  {project.description && (
                    <div className="text-xs text-gray-500 truncate">{project.description}</div>
                  )}
                </button>
              ))}

              {projects.length === 0 && (
                <div className="px-3 py-4 text-center text-gray-500 text-sm">
                  No hay proyectos. Crea uno nuevo.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showNewProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Nuevo Proyecto</h3>
              <button
                onClick={() => setShowNewProject(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mi Proyecto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descripción opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Semanal de Leads
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newProjectGoal}
                  onChange={(e) => setNewProjectGoal(parseInt(e.target.value) || 50)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewProject(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
