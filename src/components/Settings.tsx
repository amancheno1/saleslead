import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Trash2 } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

interface SettingsProps {
  onUpdate: () => void;
}

export default function Settings({ onUpdate }: SettingsProps) {
  const { currentProject, updateProject, deleteProject } = useProject();
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState(50);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentProject) {
      setProjectName(currentProject.name);
      setProjectDescription(currentProject.description || '');
      setWeeklyGoal(currentProject.weekly_goal);
    }
  }, [currentProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;

    setLoading(true);

    try {
      await updateProject(currentProject.id, {
        name: projectName,
        description: projectDescription || null,
        weekly_goal: weeklyGoal
      });

      alert('Configuración guardada correctamente');
      onUpdate();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentProject) return;
    if (!confirm(`¿Estás seguro de eliminar el proyecto "${currentProject.name}"? Esta acción no se puede deshacer y eliminará todos los leads asociados.`)) return;

    setLoading(true);

    try {
      await deleteProject(currentProject.id);
      alert('Proyecto eliminado correctamente');
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error al eliminar el proyecto');
    } finally {
      setLoading(false);
    }
  };

  if (!currentProject) {
    return <div className="text-center py-8 text-gray-600">No hay proyecto seleccionado</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-50 rounded-lg">
            <SettingsIcon className="text-blue-600" size={24} />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">Configuración del Proyecto</h2>
            <p className="text-xs md:text-sm text-gray-600">Ajusta los parámetros de tu proyecto</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Proyecto
            </label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descripción opcional del proyecto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meta de Leads Semanal
            </label>
            <input
              type="number"
              required
              min="1"
              value={weeklyGoal}
              onChange={(e) => setWeeklyGoal(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-2 text-sm text-gray-500">
              Define el número objetivo de leads que deseas capturar por semana
            </p>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-red-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-50 rounded-lg">
            <Trash2 className="text-red-600" size={24} />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">Zona Peligrosa</h2>
            <p className="text-xs md:text-sm text-gray-600">Acciones irreversibles</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Eliminar el proyecto borrará permanentemente todos los leads asociados. Esta acción no se puede deshacer.
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Eliminando...' : 'Eliminar Proyecto'}
          </button>
        </div>
      </div>
    </div>
  );
}
