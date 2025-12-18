import { useState, useEffect } from 'react';
import { Database, Calendar, Plus, Edit2, Trash2, Save, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import type { Database as DB } from '../lib/database.types';

type MetaLead = DB['public']['Tables']['meta_leads']['Row'];

export default function MetaLeads() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [metaLeads, setMetaLeads] = useState<MetaLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    week_start_date: '',
    leads_count: 0,
  });

  useEffect(() => {
    if (currentProject) {
      fetchMetaLeads();
    }
  }, [currentProject]);

  const fetchMetaLeads = async () => {
    if (!currentProject) return;

    try {
      const { data, error } = await supabase
        .from('meta_leads')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('week_start_date', { ascending: false });

      if (error) throw error;
      setMetaLeads(data || []);
    } catch (error) {
      console.error('Error fetching meta leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const getMonday = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !user) return;

    try {
      const weekDate = new Date(formData.week_start_date);
      const monday = getMonday(new Date(weekDate));
      const weekNumber = getWeekNumber(monday);
      const year = monday.getFullYear();

      if (editingId) {
        const { error } = await supabase
          .from('meta_leads')
          .update({
            week_start_date: monday.toISOString().split('T')[0],
            week_number: weekNumber,
            year: year,
            leads_count: formData.leads_count,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('meta_leads')
          .insert([{
            project_id: currentProject.id,
            user_id: user.id,
            week_start_date: monday.toISOString().split('T')[0],
            week_number: weekNumber,
            year: year,
            leads_count: formData.leads_count,
          }]);

        if (error) throw error;
      }

      setFormData({ week_start_date: '', leads_count: 0 });
      setShowForm(false);
      setEditingId(null);
      fetchMetaLeads();
    } catch (error) {
      console.error('Error saving meta lead:', error);
      alert('Error al guardar los leads de Meta');
    }
  };

  const handleEdit = (metaLead: MetaLead) => {
    setFormData({
      week_start_date: metaLead.week_start_date,
      leads_count: metaLead.leads_count,
    });
    setEditingId(metaLead.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;

    try {
      const { error } = await supabase
        .from('meta_leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchMetaLeads();
    } catch (error) {
      console.error('Error deleting meta lead:', error);
      alert('Error al eliminar el registro');
    }
  };

  const handleCancel = () => {
    setFormData({ week_start_date: '', leads_count: 0 });
    setShowForm(false);
    setEditingId(null);
  };

  const formatWeekRange = (weekStartDate: string) => {
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const startStr = start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const endStr = end.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

    return `${startStr} - ${endStr}`;
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const infoData = [
      ['Sistema de Gestión de Leads'],
      [''],
      ['Propiedad de:', 'Alejandro Mancheño Rey'],
      ['Fecha de Generación:', new Date().toLocaleDateString('es-ES')],
      ['Tipo de Informe:', 'Leads de Meta - Registro Semanal'],
      [''],
      ['© ' + new Date().getFullYear() + ' Alejandro Mancheño Rey. Todos los derechos reservados.']
    ];

    const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Información');

    const dataToExport = metaLeads.map(metaLead => ({
      'Semana': formatWeekRange(metaLead.week_start_date),
      'Año': metaLead.year,
      'Número de Semana': metaLead.week_number,
      'Cantidad de Leads': metaLead.leads_count,
      'Fecha de Registro': new Date(metaLead.created_at).toLocaleDateString('es-ES')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(wb, ws, 'Leads Meta');

    const fileName = `Leads_Meta_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Database className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Leads de Meta</h3>
              <p className="text-sm text-gray-600">Registro semanal de leads de formularios Meta</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {metaLeads.length > 0 && (
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download size={20} />
                Exportar Excel
              </button>
            )}
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                Agregar Semana
              </button>
            )}
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Semana (selecciona cualquier día de la semana)
                </label>
                <input
                  type="date"
                  required
                  min="2025-01-01"
                  max="2030-12-31"
                  value={formData.week_start_date}
                  onChange={(e) => setFormData({ ...formData, week_start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad de Leads
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.leads_count}
                  onChange={(e) => setFormData({ ...formData, leads_count: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <X size={18} />
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save size={18} />
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        )}

        {metaLeads.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="mx-auto mb-3 text-gray-400" size={48} />
            <p>No hay registros de leads de Meta</p>
            <p className="text-sm">Agrega el primer registro semanal</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Semana</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Año</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Número</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Leads</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {metaLeads.map((metaLead) => (
                  <tr key={metaLead.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {formatWeekRange(metaLead.week_start_date)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{metaLead.year}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">Semana {metaLead.week_number}</td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                      {metaLead.leads_count}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(metaLead)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(metaLead.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
