import { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProject } from '../context/ProjectContext';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];

interface LeadsTableProps {
  onEdit: (lead: Lead) => void;
  refreshTrigger: number;
}

export default function LeadsTable({ onEdit, refreshTrigger }: LeadsTableProps) {
  const { currentProject } = useProject();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'total' | 'monthly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (currentProject) {
      fetchLeads();
    }
  }, [refreshTrigger, currentProject]);

  const fetchLeads = async () => {
    if (!currentProject) return;

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLeads = () => {
    if (viewMode === 'total') {
      return leads;
    }
    return leads.filter(lead => {
      const entryDate = new Date(lead.entry_date);
      return entryDate.getMonth() === selectedMonth && entryDate.getFullYear() === selectedYear;
    });
  };

  const getMonthName = (month: number) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month];
  };

  const deleteLead = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este lead?')) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Error al eliminar el lead');
    }
  };

  const calculateCommissions = (lead: Lead) => {
    const setterCommissionSale = lead.sale_amount ? lead.sale_amount * 0.07 : 0;
    const setterCommissionCash = lead.cash_collected ? lead.cash_collected * 0.07 : 0;
    const closerCommission = lead.cash_collected ? lead.cash_collected * 0.08 : 0;
    return { setterCommissionSale, setterCommissionCash, closerCommission };
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Cargando leads...</div>;
  }

  const filteredLeads = getFilteredLeads();

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Vista Mensual
            </button>
            <button
              onClick={() => setViewMode('total')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'total'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Vista Total
            </button>
          </div>

          {viewMode === 'monthly' && (
            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>{getMonthName(i)}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}

          <div className="ml-auto text-sm text-gray-600 font-medium">
            {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full bg-white shadow-sm rounded-lg overflow-hidden">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Form</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Entrada</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contacto</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Llamada</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asistió</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Resultado</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Venta</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Importe</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cash</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Com. Setter</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Com. Closer</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Closer</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {filteredLeads.map((lead) => {
            const commissions = calculateCommissions(lead);
            return (
              <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-900">
                  {lead.first_name} {lead.last_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{lead.form_type}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(lead.entry_date).toLocaleDateString('es-ES')}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {lead.contact_date ? new Date(lead.contact_date).toLocaleDateString('es-ES') : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {lead.scheduled_call_date ? new Date(lead.scheduled_call_date).toLocaleDateString('es-ES') : '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {lead.attended_meeting === null ? (
                    <span className="text-gray-400">-</span>
                  ) : lead.attended_meeting ? (
                    <span className="text-green-600 font-medium">Sí</span>
                  ) : (
                    <span className="text-red-600 font-medium">No</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{lead.result || '-'}</td>
                <td className="px-4 py-3 text-sm">
                  {lead.sale_made ? (
                    <span className="text-green-600 font-medium">Sí</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                  {lead.sale_amount ? `$${lead.sale_amount.toFixed(2)}` : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                  {lead.cash_collected ? `$${lead.cash_collected.toFixed(2)}` : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  ${commissions.setterCommissionCash.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  ${commissions.closerCommission.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{lead.closer || '-'}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(lead)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => deleteLead(lead.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filteredLeads.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {viewMode === 'monthly'
            ? `No hay leads en ${getMonthName(selectedMonth)} ${selectedYear}`
            : 'No hay leads registrados'}
        </div>
      )}
      </div>
    </div>
  );
}
