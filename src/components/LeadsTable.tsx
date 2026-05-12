import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, Download, Upload, MessageCircle, Mail, AlertCircle, CheckCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];

interface LeadsTableProps {
  onEdit: (lead: Lead) => void;
  refreshTrigger: number;
}

export default function LeadsTable({ onEdit, refreshTrigger }: LeadsTableProps) {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'total' | 'monthly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importMapping, setImportMapping] = useState<{ [key: string]: string }>({});
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const closerCommission = lead.cash_collected ? lead.cash_collected * 0.08 : 0;
    return { closerCommission };
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const infoData = [
      ['Sistema de Gestión de Leads'],
      [''],
      ['Propiedad de:', 'Amaogoia Louvier'],
      ['Fecha de Generación:', new Date().toLocaleDateString('es-ES')],
      ['Periodo:', viewMode === 'monthly' ? `${getMonthName(selectedMonth)} ${selectedYear}` : 'Total'],
      ['Total de Leads:', filteredLeads.length],
      [''],
      ['© ' + new Date().getFullYear() + ' Amaogoia Louvier. Todos los derechos reservados.']
    ];

    const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Información');

    const leadsToExport = filteredLeads.map(lead => {
      const commissions = calculateCommissions(lead);
      const exportData: any = {
        'Nombre': `${lead.first_name} ${lead.last_name}`,
        'Formulario': lead.form_type,
        'Fecha de Entrada': new Date(lead.entry_date).toLocaleDateString('es-ES'),
        'Fecha de Contacto': lead.contact_date ? new Date(lead.contact_date).toLocaleDateString('es-ES') : '',
        'Llamada Agendada': lead.scheduled_call_date ? new Date(lead.scheduled_call_date).toLocaleDateString('es-ES') : '',
        'Asistió': lead.attended_meeting === null ? '' :
          lead.attended_meeting === 'si' ? 'Sí' :
          lead.attended_meeting === 'cancelada' ? 'Cancelada' :
          lead.attended_meeting === 'no_show' ? 'No Show' :
          lead.attended_meeting === 'no' ? 'No' : '',
        'Resultado': lead.result || '',
        'Venta': lead.sale_made ? 'Sí' : 'No',
        'Importe Venta': lead.sale_amount || 0,
        'Cash Collected': lead.cash_collected || 0,
        'Método de Pago': lead.payment_method || '',
      };

      if (lead.payment_method === 'Pago a plazos') {
        exportData['Número de Plazos'] = lead.installment_count || '';
        exportData['Importe Inicial'] = lead.initial_payment || 0;
      }

      exportData['Closer'] = lead.closer || '';
      exportData['Comision Closer'] = commissions.closerCommission;
      exportData['Observaciones'] = lead.observations || '';

      return exportData;
    });

    const wsLeads = XLSX.utils.json_to_sheet(leadsToExport);
    XLSX.utils.book_append_sheet(wb, wsLeads, 'Todos los Leads');

    const monthlyData: { [key: string]: {
      month: string;
      leads: number;
      sales: number;
      totalRevenue: number;
      totalCash: number;
      closerCommissions: number;
    }} = {};

    filteredLeads.forEach(lead => {
      const entryDate = new Date(lead.entry_date);
      const monthKey = `${getMonthName(entryDate.getMonth())} ${entryDate.getFullYear()}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          leads: 0,
          sales: 0,
          totalRevenue: 0,
          totalCash: 0,
          closerCommissions: 0
        };
      }

      const commissions = calculateCommissions(lead);
      monthlyData[monthKey].leads++;
      if (lead.sale_made) monthlyData[monthKey].sales++;
      monthlyData[monthKey].totalRevenue += lead.sale_amount || 0;
      monthlyData[monthKey].totalCash += lead.cash_collected || 0;
      monthlyData[monthKey].closerCommissions += commissions.closerCommission;
    });

    const billingReport = Object.values(monthlyData).map(data => ({
      'Mes': data.month,
      'Total Leads': data.leads,
      'Ventas Cerradas': data.sales,
      'Tasa de Cierre (%)': data.leads > 0 ? ((data.sales / data.leads) * 100).toFixed(2) : '0.00',
      'Facturacion Total': data.totalRevenue.toFixed(2),
      'Cash Collected': data.totalCash.toFixed(2),
      'Comisiones Closer': data.closerCommissions.toFixed(2),
    }));

    const wsBilling = XLSX.utils.json_to_sheet(billingReport);
    XLSX.utils.book_append_sheet(wb, wsBilling, 'Informe de Facturación');

    const commissionsReport = filteredLeads
      .filter(lead => lead.sale_made)
      .map(lead => {
        const commissions = calculateCommissions(lead);
        const entryDate = new Date(lead.entry_date);
        return {
          'Mes': `${getMonthName(entryDate.getMonth())} ${entryDate.getFullYear()}`,
          'Cliente': `${lead.first_name} ${lead.last_name}`,
          'Fecha Venta': new Date(lead.entry_date).toLocaleDateString('es-ES'),
          'Importe Venta': lead.sale_amount || 0,
          'Cash Collected': lead.cash_collected || 0,
          'Comision Closer': commissions.closerCommission.toFixed(2),
          'Closer': lead.closer || '',
          'Método Pago': lead.payment_method || ''
        };
      });

    const wsCommissions = XLSX.utils.json_to_sheet(commissionsReport);
    XLSX.utils.book_append_sheet(wb, wsCommissions, 'Comisiones por Mes');

    const fileName = viewMode === 'monthly'
      ? `Informe_Completo_${getMonthName(selectedMonth)}_${selectedYear}.xlsx`
      : `Informe_Completo_Total_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  const leadFields = [
    { key: 'first_name', label: 'Nombre', required: true },
    { key: 'last_name', label: 'Apellido', required: true },
    { key: 'phone', label: 'Teléfono', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'form_type', label: 'Tipo de Formulario', required: false },
    { key: 'entry_date', label: 'Fecha de Entrada', required: false },
    { key: 'contact_date', label: 'Fecha de Contacto', required: false },
    { key: 'scheduled_call_date', label: 'Fecha Llamada Agendada', required: false },
    { key: 'closer', label: 'Closer', required: false },
    { key: 'observations', label: 'Observaciones', required: false },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonData.length === 0) return;

      const headers = Object.keys(jsonData[0] as object);
      setImportHeaders(headers);
      setImportData(jsonData);

      const autoMapping: { [key: string]: string } = {};
      const nameMatches: { [key: string]: string[] } = {
        first_name: ['nombre', 'first_name', 'name', 'primer nombre'],
        last_name: ['apellido', 'last_name', 'surname', 'apellidos'],
        phone: ['telefono', 'teléfono', 'phone', 'celular', 'móvil', 'movil', 'whatsapp'],
        email: ['email', 'correo', 'e-mail', 'mail'],
        form_type: ['formulario', 'form', 'tipo', 'form_type', 'origen'],
        entry_date: ['fecha', 'fecha de entrada', 'entry_date', 'date', 'fecha ingreso'],
        contact_date: ['fecha contacto', 'contact_date', 'fecha de contacto'],
        scheduled_call_date: ['llamada', 'llamada agendada', 'scheduled', 'fecha llamada'],
        closer: ['closer', 'vendedor', 'asesor'],
        observations: ['observaciones', 'notas', 'notes', 'observations', 'comentarios'],
      };

      headers.forEach(header => {
        const lowerHeader = header.toLowerCase().trim();
        for (const [field, matches] of Object.entries(nameMatches)) {
          if (matches.some(m => lowerHeader.includes(m))) {
            if (!autoMapping[field]) {
              autoMapping[field] = header;
            }
          }
        }
      });

      setImportMapping(autoMapping);
      setShowImportModal(true);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (!currentProject || !user) return;
    setImporting(true);
    setImportResult(null);

    let success = 0;
    let errors = 0;

    for (const row of importData) {
      try {
        const firstName = importMapping.first_name ? String(row[importMapping.first_name] || '').trim() : '';
        const lastName = importMapping.last_name ? String(row[importMapping.last_name] || '').trim() : '';

        if (!firstName && !lastName) {
          errors++;
          continue;
        }

        const parseDate = (val: any): string | null => {
          if (!val) return null;
          if (typeof val === 'number') {
            const date = XLSX.SSF.parse_date_code(val);
            if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
          }
          const str = String(val).trim();
          const parsed = new Date(str);
          if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
          const parts = str.split(/[/.-]/);
          if (parts.length === 3) {
            const [d, m, y] = parts;
            const dateObj = new Date(parseInt(y.length === 2 ? '20' + y : y), parseInt(m) - 1, parseInt(d));
            if (!isNaN(dateObj.getTime())) return dateObj.toISOString().split('T')[0];
          }
          return null;
        };

        const leadData: any = {
          project_id: currentProject.id,
          user_id: user.id,
          first_name: firstName || 'Sin nombre',
          last_name: lastName || '',
          form_type: importMapping.form_type ? String(row[importMapping.form_type] || 'Importado') : 'Importado',
          entry_date: (importMapping.entry_date ? parseDate(row[importMapping.entry_date]) : null) || new Date().toISOString().split('T')[0],
          phone: importMapping.phone ? String(row[importMapping.phone] || '').trim() || null : null,
          email: importMapping.email ? String(row[importMapping.email] || '').trim() || null : null,
          contact_date: importMapping.contact_date ? parseDate(row[importMapping.contact_date]) : null,
          scheduled_call_date: importMapping.scheduled_call_date ? parseDate(row[importMapping.scheduled_call_date]) : null,
          closer: importMapping.closer ? String(row[importMapping.closer] || '').trim() || null : null,
          observations: importMapping.observations ? String(row[importMapping.observations] || '').trim() || null : null,
        };

        const { error } = await supabase.from('leads').insert([leadData]);
        if (error) {
          errors++;
        } else {
          success++;
        }
      } catch {
        errors++;
      }
    }

    setImportResult({ success, errors });
    setImporting(false);
    if (success > 0) fetchLeads();
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
                {Array.from({ length: 6 }, (_, i) => 2025 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}

          <div className="ml-auto flex items-center gap-4">
            <div className="text-sm text-gray-600 font-medium">
              {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Upload size={18} />
              Importar Excel
            </button>
            <button
              onClick={exportToExcel}
              disabled={filteredLeads.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              <Download size={18} />
              Exportar Excel
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full bg-white shadow-sm rounded-lg overflow-hidden">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contacto</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Entrada</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Llamada</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asistio</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Resultado</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Venta</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Importe</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cash</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Closer</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {filteredLeads.map((lead) => {
            const commissions = calculateCommissions(lead);
            return (
              <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {lead.first_name} {lead.last_name}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-1">
                    {lead.phone && (
                      <a
                        href={`https://wa.me/${lead.phone.replace(/[^0-9+]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="WhatsApp"
                      >
                        <MessageCircle size={15} />
                      </a>
                    )}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Email"
                      >
                        <Mail size={15} />
                      </a>
                    )}
                    {!lead.phone && !lead.email && <span className="text-gray-400 text-xs">-</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(lead.entry_date).toLocaleDateString('es-ES')}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {lead.scheduled_call_date ? new Date(lead.scheduled_call_date).toLocaleDateString('es-ES') : '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {lead.attended_meeting === null ? (
                    <span className="text-gray-400">-</span>
                  ) : lead.attended_meeting === 'si' ? (
                    <span className="text-green-600 font-medium">Si</span>
                  ) : lead.attended_meeting === 'cancelada' ? (
                    <span className="text-red-600 font-medium">Cancelada</span>
                  ) : lead.attended_meeting === 'no_show' ? (
                    <span className="text-orange-600 font-medium">No Show</span>
                  ) : lead.attended_meeting === 'no' ? (
                    <span className="text-gray-600 font-medium">No</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{lead.result || '-'}</td>
                <td className="px-4 py-3 text-sm">
                  {lead.sale_made ? (
                    <span className="text-green-600 font-medium">Si</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                  {lead.sale_amount ? `€${lead.sale_amount.toFixed(2)}` : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                  {lead.cash_collected ? `€${lead.cash_collected.toFixed(2)}` : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{lead.closer || '-'}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-1">
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

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Importar Leads desde Excel</h2>
                <p className="text-sm text-blue-100 mt-1">{importData.length} filas detectadas</p>
              </div>
              <button
                onClick={() => { setShowImportModal(false); setImportResult(null); }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="text-white" size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              {importResult ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="text-green-600" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Importación Completada</h3>
                  <p className="text-gray-600 mb-4">
                    {importResult.success} leads importados correctamente
                    {importResult.errors > 0 && `, ${importResult.errors} con errores`}
                  </p>
                  <button
                    onClick={() => { setShowImportModal(false); setImportResult(null); }}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="text-sm font-bold text-blue-900">Mapea las columnas de tu archivo</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Asigna cada columna de tu Excel al campo correspondiente. Los campos con * son obligatorios.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {leadFields.map(field => (
                      <div key={field.key} className="flex items-center gap-4">
                        <div className="w-48 shrink-0">
                          <p className="text-sm font-bold text-gray-800">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </p>
                        </div>
                        <select
                          value={importMapping[field.key] || ''}
                          onChange={(e) => setImportMapping({ ...importMapping, [field.key]: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">-- No asignar --</option>
                          {importHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  {importData.length > 0 && (
                    <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wide px-4 py-2 bg-gray-50 border-b border-gray-200">
                        Vista previa (primeras 3 filas)
                      </p>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              {importHeaders.slice(0, 6).map(h => (
                                <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {importData.slice(0, 3).map((row, i) => (
                              <tr key={i}>
                                {importHeaders.slice(0, 6).map(h => (
                                  <td key={h} className="px-3 py-2 text-gray-700 truncate max-w-[150px]">
                                    {String(row[h] || '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-bold text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={importing || !importMapping.first_name}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {importing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Importando...
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          Importar {importData.length} leads
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
