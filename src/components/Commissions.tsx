import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProject } from '../context/ProjectContext';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];

interface CommissionsProps {
  refreshTrigger: number;
}

export default function Commissions({ refreshTrigger }: CommissionsProps) {
  const { currentProject } = useProject();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showSalesDetail, setShowSalesDetail] = useState(false);

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

  const calculateCommissions = () => {
    const monthlyLeads = leads.filter(lead => {
      const entryDate = new Date(lead.entry_date);
      return entryDate.getMonth() === selectedMonth && entryDate.getFullYear() === selectedYear;
    });

    const salesLeads = monthlyLeads.filter(l => l.sale_made);
    const totalSales = salesLeads.length;
    const totalRevenue = monthlyLeads.reduce((sum, l) => sum + (l.sale_amount || 0), 0);
    const totalCashCollected = monthlyLeads.reduce((sum, l) => sum + (l.cash_collected || 0), 0);

    const setterCommissionFromSales = totalRevenue * 0.07;
    const setterCommissionFromCash = totalCashCollected * 0.07;
    const closerCommissionFromSales = totalRevenue * 0.08;
    const closerCommissionFromCash = totalCashCollected * 0.08;

    const closerBreakdown: { [key: string]: { sales: number; revenue: number; cashCollected: number; commissionFromSales: number; commissionFromCash: number; totalCommission: number } } = {};
    monthlyLeads.forEach(lead => {
      if (lead.sale_made && lead.closer) {
        if (!closerBreakdown[lead.closer]) {
          closerBreakdown[lead.closer] = { sales: 0, revenue: 0, cashCollected: 0, commissionFromSales: 0, commissionFromCash: 0, totalCommission: 0 };
        }
        closerBreakdown[lead.closer].sales += 1;
        closerBreakdown[lead.closer].revenue += lead.sale_amount || 0;
        closerBreakdown[lead.closer].cashCollected += lead.cash_collected || 0;
        closerBreakdown[lead.closer].commissionFromSales += (lead.sale_amount || 0) * 0.08;
        closerBreakdown[lead.closer].commissionFromCash += (lead.cash_collected || 0) * 0.08;
        closerBreakdown[lead.closer].totalCommission += ((lead.sale_amount || 0) * 0.08) + ((lead.cash_collected || 0) * 0.08);
      }
    });

    return {
      totalSales,
      totalRevenue,
      totalCashCollected,
      setterCommissionFromSales,
      setterCommissionFromCash,
      closerCommissionFromSales,
      closerCommissionFromCash,
      closerBreakdown,
      salesLeads
    };
  };

  const getMonthName = (month: number) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month];
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Cargando comisiones...</div>;
  }

  const metrics = calculateCommissions();

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
      <div className="bg-gradient-to-r from-cyan-600 to-teal-700 rounded-lg shadow-lg p-4 md:p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-2">Comisiones</h2>
            <p className="text-sm md:text-base text-cyan-100">Cálculo de comisiones de setter y closers</p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium focus:ring-2 focus:ring-cyan-300"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>{getMonthName(i)}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium focus:ring-2 focus:ring-cyan-300"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-blue-100">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Users className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Comisiones Setter</h3>
            <p className="text-xs md:text-sm text-gray-600">7% sobre ventas y cash collected</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <StatCard
            icon={DollarSign}
            label="Comisión sobre Ventas (7%)"
            value={`€${metrics.setterCommissionFromSales.toFixed(2)}`}
            subtitle={`Sobre €${metrics.totalRevenue.toFixed(2)}`}
            color="blue"
          />
          <StatCard
            icon={DollarSign}
            label="Comisión sobre Cash (7%)"
            value={`€${metrics.setterCommissionFromCash.toFixed(2)}`}
            subtitle={`Sobre €${metrics.totalCashCollected.toFixed(2)}`}
            color="blue"
          />
          <div
            className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setShowSalesDetail(!showSalesDetail)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Total Ventas</p>
                <p className="text-xl md:text-3xl font-bold text-green-600 truncate">{metrics.totalSales}</p>
                <p className="text-xs text-gray-500 mt-1">{getMonthName(selectedMonth)} {selectedYear}</p>
              </div>
              <div className="p-2 md:p-3 bg-green-50 rounded-lg flex-shrink-0">
                <TrendingUp className="text-green-600" size={20} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-green-100">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="p-3 bg-green-50 rounded-lg">
            <Award className="text-green-600" size={24} />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Comisiones Closers</h3>
            <p className="text-xs md:text-sm text-gray-600">8% sobre ventas y cash collected</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
          <StatCard
            icon={DollarSign}
            label="Comisión sobre Ventas (8%)"
            value={`€${metrics.closerCommissionFromSales.toFixed(2)}`}
            subtitle={`Sobre €${metrics.totalRevenue.toFixed(2)}`}
            color="green"
          />
          <StatCard
            icon={DollarSign}
            label="Comisión sobre Cash (8%)"
            value={`€${metrics.closerCommissionFromCash.toFixed(2)}`}
            subtitle={`Sobre €${metrics.totalCashCollected.toFixed(2)}`}
            color="green"
          />
          <div
            className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setShowSalesDetail(!showSalesDetail)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Total Ventas</p>
                <p className="text-xl md:text-3xl font-bold text-cyan-600 truncate">{metrics.totalSales}</p>
                <p className="text-xs text-gray-500 mt-1">{getMonthName(selectedMonth)} {selectedYear}</p>
              </div>
              <div className="p-2 md:p-3 bg-cyan-50 rounded-lg flex-shrink-0">
                <TrendingUp className="text-cyan-600" size={20} />
              </div>
            </div>
          </div>
        </div>

        {Object.keys(metrics.closerBreakdown).length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Desglose por Closer</h4>
            {Object.entries(metrics.closerBreakdown)
              .sort((a, b) => b[1].totalCommission - a[1].totalCommission)
              .map(([closer, data]) => (
                <div key={closer} className="p-3 md:p-4 bg-gray-50 rounded-lg">
                  <div className="flex flex-col gap-3">
                    <div className="flex-1 min-w-0 mb-2">
                      <p className="font-semibold text-gray-900 text-sm md:text-base truncate">{closer}</p>
                      <p className="text-xs md:text-sm text-gray-600">
                        {data.sales} {data.sales === 1 ? 'venta' : 'ventas'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Sobre Ventas (8%)</p>
                        <p className="text-sm font-bold text-gray-900">€{data.commissionFromSales.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Base: €{data.revenue.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Sobre Cash (8%)</p>
                        <p className="text-sm font-bold text-gray-900">€{data.commissionFromCash.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Base: €{data.cashCollected.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            No hay ventas con closers asignados en este período
          </div>
        )}
      </div>

      {showSalesDetail && metrics.salesLeads.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-purple-100">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Detalle de Ventas Realizadas</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closer</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Venta</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cash Collected</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.salesLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {new Date(lead.entry_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{lead.client_name}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{lead.closer || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      €{(lead.sale_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      €{(lead.cash_collected || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
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
    </div>
  );
}
