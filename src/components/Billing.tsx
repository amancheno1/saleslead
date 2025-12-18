import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, CreditCard, Wallet, Calendar } from 'lucide-react';
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

    const totalSales = monthlyLeads.filter(l => l.sale_made).length;
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
      salesByPaymentMethod
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
          value={`$${metrics.totalRevenue.toFixed(2)}`}
          subtitle="Valor total de ventas"
          color="blue"
        />
        <StatCard
          icon={Wallet}
          label="Cash Collected"
          value={`$${metrics.totalCashCollected.toFixed(2)}`}
          subtitle="Efectivo recaudado"
          color="green"
        />
        <StatCard
          icon={CreditCard}
          label="Pagos Pendientes"
          value={`$${metrics.pendingPayments.toFixed(2)}`}
          subtitle="Por cobrar"
          color="orange"
        />
        <StatCard
          icon={DollarSign}
          label="Ticket Promedio"
          value={`$${metrics.averageSaleValue.toFixed(2)}`}
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
                  <p className="text-base md:text-lg font-bold text-green-600">${data.amount.toFixed(2)}</p>
                  <p className="text-xs md:text-sm text-gray-500">
                    {((data.amount / metrics.totalRevenue) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {metrics.totalSales === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-100 text-center">
          <DollarSign className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 text-sm md:text-base">No hay ventas registradas para este período</p>
        </div>
      )}
    </div>
  );
}
