import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, CreditCard, Wallet, Calendar, ExternalLink, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProject } from '../context/ProjectContext';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];

interface BillingProps {
  refreshTrigger: number;
}

export default function Billing({ refreshTrigger }: BillingProps) {
  const { currentProject } = useProject();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (currentProject) {
      fetchData();
    }
  }, [refreshTrigger, currentProject, selectedMonth, selectedYear]);

  const fetchData = async () => {
    if (!currentProject) return;

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('project_id', currentProject.id);

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinancialMetrics = () => {
    const monthlyLeads = leads.filter(lead => {
      const entryDate = new Date(lead.entry_date);
      return entryDate.getMonth() === selectedMonth && entryDate.getFullYear() === selectedYear;
    });

    const salesLeads = monthlyLeads.filter(l => l.sale_made);
    const totalSales = salesLeads.length;
    const totalRevenue = monthlyLeads.reduce((sum, l) => sum + (l.sale_amount || 0), 0);
    const totalCashCollected = monthlyLeads.reduce((sum, l) => sum + (l.cash_collected || 0), 0);
    const pendingPayments = totalRevenue - totalCashCollected;
    const averageSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    const salesByPaymentMethod: { [key: string]: { count: number; amount: number } } = {};
    monthlyLeads.forEach(lead => {
      if (lead.sale_made && lead.payment_method) {
        if (!salesByPaymentMethod[lead.payment_method]) {
          salesByPaymentMethod[lead.payment_method] = { count: 0, amount: 0 };
        }
        salesByPaymentMethod[lead.payment_method].count += 1;
        salesByPaymentMethod[lead.payment_method].amount += lead.sale_amount || 0;
      }
    });

    return {
      totalSales,
      totalRevenue,
      totalCashCollected,
      pendingPayments,
      averageSaleValue,
      salesByPaymentMethod,
      salesLeads
    };
  };

  const getMonthName = (month: number) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month];
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Cargando facturación...</div>;
  }

  const metrics = calculateFinancialMetrics();

  const StatCard = ({ icon: Icon, label, value, subtitle, color = 'blue' }: any) => (
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className={`text-xl md:text-3xl font-bold text-${color}-600 truncate`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 md:p-3 bg-${color}-50 rounded-lg flex-shrink-0`}>
          <Icon className={`text-${color}-600`} size={20} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-4 md:p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-2">Facturación</h2>
            <p className="text-sm md:text-base text-green-100">Datos económicos y financieros</p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-300"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>{getMonthName(i)}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-300"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <StatCard
          icon={TrendingUp}
          label="Ventas Totales"
          value={metrics.totalSales}
          subtitle={`${getMonthName(selectedMonth)} ${selectedYear}`}
          color="green"
        />
        <StatCard
          icon={DollarSign}
          label="Facturación Total"
          value={`€${metrics.totalRevenue.toFixed(2)}`}
          subtitle="Valor total de ventas"
          color="blue"
        />
        <StatCard
          icon={Wallet}
          label="Cash Collected"
          value={`€${metrics.totalCashCollected.toFixed(2)}`}
          subtitle="Efectivo recaudado"
          color="green"
        />
        <StatCard
          icon={CreditCard}
          label="Pagos Pendientes"
          value={`€${metrics.pendingPayments.toFixed(2)}`}
          subtitle="Por cobrar"
          color="orange"
        />
        <StatCard
          icon={DollarSign}
          label="Ticket Promedio"
          value={`€${metrics.averageSaleValue.toFixed(2)}`}
          subtitle="Valor promedio por venta"
          color="blue"
        />
        <StatCard
          icon={Calendar}
          label="Tasa de Cobro"
          value={`${metrics.totalRevenue > 0 ? ((metrics.totalCashCollected / metrics.totalRevenue) * 100).toFixed(1) : 0}%`}
          subtitle="Cash collected vs facturado"
          color="green"
        />
      </div>

      {Object.keys(metrics.salesByPaymentMethod).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-100">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Ventas por Forma de Pago</h3>
          <div className="space-y-3">
            {Object.entries(metrics.salesByPaymentMethod).map(([method, data]) => (
              <div key={method} className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm md:text-base truncate">{method}</p>
                  <p className="text-xs md:text-sm text-gray-600">{data.count} {data.count === 1 ? 'venta' : 'ventas'}</p>
                </div>
                <div className="text-right">
                  <p className="text-base md:text-lg font-bold text-green-600">€{data.amount.toFixed(2)}</p>
                  <p className="text-xs md:text-sm text-gray-500">
                    {((data.amount / metrics.totalRevenue) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {metrics.salesLeads.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">
              Ventas Cerradas ({metrics.salesLeads.length})
            </h3>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              Lista detallada de todas las ventas del período
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Closer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Monto Venta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cash Collected
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Forma de Pago
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {metrics.salesLeads.map((lead) => {
                  const pendingAmount = (lead.sale_amount || 0) - (lead.cash_collected || 0);
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {new Date(lead.entry_date).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {lead.first_name} {lead.last_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {lead.closer || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        €{(lead.sale_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-medium ${
                          pendingAmount > 0 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          €{(lead.cash_collected || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {lead.payment_method || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                        >
                          <Eye size={16} />
                          <span className="font-medium">Ver</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {metrics.totalSales === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-100 text-center">
          <DollarSign className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 text-sm md:text-base">No hay ventas registradas para este período</p>
        </div>
      )}

      {selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Detalles de Venta</h3>
                  <p className="text-sm text-blue-100 mt-1">
                    {selectedLead.first_name} {selectedLead.last_name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha de Entrada</label>
                  <p className="mt-1 text-sm text-gray-900 font-medium">
                    {new Date(selectedLead.entry_date).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Teléfono</label>
                  <p className="mt-1 text-sm text-gray-900 font-medium">{selectedLead.phone}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</label>
                  <p className="mt-1 text-sm text-gray-900 font-medium">{selectedLead.email || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Setter</label>
                  <p className="mt-1 text-sm text-gray-900 font-medium">{selectedLead.setter || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Closer</label>
                  <p className="mt-1 text-sm text-gray-900 font-medium">{selectedLead.closer || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado Reunión</label>
                  <p className="mt-1 text-sm text-gray-900 font-medium">{selectedLead.meeting_status || '-'}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                  Información Financiera
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <label className="text-xs font-semibold text-green-700 uppercase tracking-wider">Monto de Venta</label>
                    <p className="mt-1 text-2xl text-green-600 font-bold">
                      €{(selectedLead.sale_amount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <label className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Cash Collected</label>
                    <p className="mt-1 text-2xl text-blue-600 font-bold">
                      €{(selectedLead.cash_collected || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg border ${
                    (selectedLead.sale_amount || 0) - (selectedLead.cash_collected || 0) > 0
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <label className={`text-xs font-semibold uppercase tracking-wider ${
                      (selectedLead.sale_amount || 0) - (selectedLead.cash_collected || 0) > 0
                        ? 'text-orange-700'
                        : 'text-gray-700'
                    }`}>Pendiente de Cobro</label>
                    <p className={`mt-1 text-2xl font-bold ${
                      (selectedLead.sale_amount || 0) - (selectedLead.cash_collected || 0) > 0
                        ? 'text-orange-600'
                        : 'text-gray-600'
                    }`}>
                      €{((selectedLead.sale_amount || 0) - (selectedLead.cash_collected || 0)).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Forma de Pago</label>
                    <p className="mt-1 text-lg text-gray-900 font-medium">
                      {selectedLead.payment_method || 'No especificada'}
                    </p>
                  </div>
                </div>
              </div>

              {selectedLead.notes && (
                <div className="border-t border-gray-200 pt-6">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Notas</label>
                  <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {selectedLead.notes}
                  </p>
                </div>
              )}

              <div className="border-t border-gray-200 pt-6">
                <button
                  onClick={() => setSelectedLead(null)}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
