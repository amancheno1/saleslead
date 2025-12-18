import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProject } from '../context/ProjectContext';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];

interface MonthlyComparisonProps {
  refreshTrigger: number;
}

export default function MonthlyComparison({ refreshTrigger }: MonthlyComparisonProps) {
  const { currentProject } = useProject();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentProject) {
      fetchData();
    }
  }, [refreshTrigger, currentProject]);

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

  const calculateMonthlyData = () => {
    const monthlyData: {
      [key: string]: {
        month: string;
        leads: number;
        sales: number;
        revenue: number;
        cashCollected: number;
      };
    } = {};

    const now = new Date();
    const currentYear = now.getFullYear();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const monthName = date.toLocaleDateString('es-ES', { month: 'short' });

      monthlyData[key] = {
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        leads: 0,
        sales: 0,
        revenue: 0,
        cashCollected: 0
      };
    }

    leads.forEach(lead => {
      const entryDate = new Date(lead.entry_date);
      const key = `${entryDate.getFullYear()}-${entryDate.getMonth()}`;

      if (monthlyData[key]) {
        monthlyData[key].leads += 1;
        if (lead.sale_made) {
          monthlyData[key].sales += 1;
          monthlyData[key].revenue += lead.sale_amount || 0;
          monthlyData[key].cashCollected += lead.cash_collected || 0;
        }
      }
    });

    return Object.values(monthlyData);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Cargando comparación...</div>;
  }

  const monthlyData = calculateMonthlyData();
  const maxLeads = Math.max(...monthlyData.map(d => d.leads), 1);
  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-50 rounded-lg">
            <BarChart3 className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Comparación de Leads (Últimos 6 Meses)</h3>
            <p className="text-xs md:text-sm text-gray-600">Evolución mensual de leads y ventas</p>
          </div>
        </div>

        <div className="space-y-4">
          {monthlyData.map((data, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700 min-w-[60px]">{data.month}</span>
                <span className="text-gray-600">{data.leads} leads • {data.sales} ventas</span>
              </div>
              <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${(data.leads / maxLeads) * 100}%` }}
                />
                <div
                  className="absolute h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                  style={{ width: `${(data.sales / maxLeads) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded"></div>
            <span className="text-gray-600">Leads</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-green-600 rounded"></div>
            <span className="text-gray-600">Ventas</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-50 rounded-lg">
            <TrendingUp className="text-green-600" size={24} />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Comparación de Facturación (Últimos 6 Meses)</h3>
            <p className="text-xs md:text-sm text-gray-600">Evolución mensual de ingresos</p>
          </div>
        </div>

        <div className="space-y-4">
          {monthlyData.map((data, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700 min-w-[60px]">{data.month}</span>
                <span className="text-gray-600">${data.revenue.toFixed(0)}</span>
              </div>
              <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500 flex items-center justify-end px-3"
                  style={{ width: `${(data.revenue / maxRevenue) * 100}%` }}
                >
                  {data.revenue > 0 && (
                    <span className="text-xs font-medium text-white">
                      ${data.revenue.toFixed(0)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Cash: ${data.cashCollected.toFixed(0)}</span>
                <span>{data.revenue > 0 ? ((data.cashCollected / data.revenue) * 100).toFixed(0) : 0}% cobrado</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
