import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProject } from '../context/ProjectContext';
import type { Database as DB } from '../lib/database.types';

type Lead = DB['public']['Tables']['leads']['Row'];
type MetaLead = DB['public']['Tables']['meta_leads']['Row'];

interface MonthlyComparisonProps {
  refreshTrigger: number;
}

export default function MonthlyComparison({ refreshTrigger }: MonthlyComparisonProps) {
  const { currentProject } = useProject();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metaLeads, setMetaLeads] = useState<MetaLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentProject) {
      fetchData();
    }
  }, [refreshTrigger, currentProject]);

  const fetchData = async () => {
    if (!currentProject) return;

    try {
      const [leadsResponse, metaLeadsResponse] = await Promise.all([
        supabase
          .from('leads')
          .select('*')
          .eq('project_id', currentProject.id),
        supabase
          .from('meta_leads')
          .select('*')
          .eq('project_id', currentProject.id)
      ]);

      if (leadsResponse.error) throw leadsResponse.error;
      if (metaLeadsResponse.error) throw metaLeadsResponse.error;

      setLeads(leadsResponse.data || []);
      setMetaLeads(metaLeadsResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const calculateWeeklyData = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const weeksData: {
      [key: string]: {
        weekLabel: string;
        weekNumber: number;
        manualLeads: number;
        metaLeads: number;
        sales: number;
        revenue: number;
      };
    } = {};

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    let currentDate = new Date(firstDayOfMonth);
    const monday = getMonday(new Date(currentDate));

    for (let i = 0; i < 6; i++) {
      const weekStart = new Date(monday);
      weekStart.setDate(weekStart.getDate() + (i * 7));

      if (weekStart > lastDayOfMonth) break;

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekNumber = getWeekNumber(weekStart);
      const key = `${weekStart.getFullYear()}-W${weekNumber}`;

      weeksData[key] = {
        weekLabel: `Semana ${i + 1}`,
        weekNumber: weekNumber,
        manualLeads: 0,
        metaLeads: 0,
        sales: 0,
        revenue: 0
      };

      leads.forEach(lead => {
        const entryDate = new Date(lead.entry_date);
        if (entryDate >= weekStart && entryDate <= weekEnd) {
          weeksData[key].manualLeads += 1;
          if (lead.sale_made) {
            weeksData[key].sales += 1;
            weeksData[key].revenue += lead.sale_amount || 0;
          }
        }
      });

      metaLeads.forEach(metaLead => {
        const metaWeekStart = new Date(metaLead.week_start_date);
        if (metaWeekStart >= weekStart && metaWeekStart <= weekEnd) {
          weeksData[key].metaLeads += metaLead.leads_count;
        }
      });
    }

    return Object.values(weeksData);
  };

  const calculateMonthlyData = () => {
    const monthlyData: {
      [key: string]: {
        month: string;
        manualLeads: number;
        metaLeads: number;
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
        manualLeads: 0,
        metaLeads: 0,
        sales: 0,
        revenue: 0,
        cashCollected: 0
      };
    }

    leads.forEach(lead => {
      const entryDate = new Date(lead.entry_date);
      const key = `${entryDate.getFullYear()}-${entryDate.getMonth()}`;

      if (monthlyData[key]) {
        monthlyData[key].manualLeads += 1;
        if (lead.sale_made) {
          monthlyData[key].sales += 1;
          monthlyData[key].revenue += lead.sale_amount || 0;
          monthlyData[key].cashCollected += lead.cash_collected || 0;
        }
      }
    });

    metaLeads.forEach(metaLead => {
      const metaDate = new Date(metaLead.week_start_date);
      const key = `${metaDate.getFullYear()}-${metaDate.getMonth()}`;

      if (monthlyData[key]) {
        monthlyData[key].metaLeads += metaLead.leads_count;
      }
    });

    return Object.values(monthlyData);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Cargando comparación...</div>;
  }

  const weeklyData = calculateWeeklyData();
  const monthlyData = calculateMonthlyData();

  const maxWeeklyLeads = Math.max(
    ...weeklyData.map(d => d.manualLeads + d.metaLeads),
    1
  );

  const maxMonthlyLeads = Math.max(
    ...monthlyData.map(d => d.manualLeads + d.metaLeads),
    1
  );

  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-50 rounded-lg">
            <BarChart3 className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Comparación Semanal - Mes Actual</h3>
            <p className="text-sm text-gray-600">Leads de Meta vs Leads Manuales por semana</p>
          </div>
        </div>

        {weeklyData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay datos para mostrar</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-end justify-around gap-4 h-80 pb-4">
              {weeklyData.map((data, index) => {
                const totalLeads = data.manualLeads + data.metaLeads;
                const metaPercentage = totalLeads > 0 ? (data.metaLeads / maxWeeklyLeads) * 100 : 0;
                const manualPercentage = totalLeads > 0 ? (data.manualLeads / maxWeeklyLeads) * 100 : 0;

                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-center mb-2">
                      <p className="text-lg font-bold text-gray-900">{totalLeads}</p>
                      <p className="text-xs text-gray-500">total</p>
                    </div>
                    <div className="w-full flex gap-1 items-end justify-center" style={{ height: '240px' }}>
                      <div className="relative flex flex-col justify-end w-1/2 h-full">
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-600 hover:to-blue-500 shadow-lg relative group"
                          style={{ height: `${metaPercentage}%`, minHeight: data.metaLeads > 0 ? '20px' : '0' }}
                        >
                          {data.metaLeads > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-white font-bold text-sm">{data.metaLeads}</span>
                            </div>
                          )}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                            Meta: {data.metaLeads}
                          </div>
                        </div>
                      </div>
                      <div className="relative flex flex-col justify-end w-1/2 h-full">
                        <div
                          className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg transition-all duration-500 hover:from-green-600 hover:to-green-500 shadow-lg relative group"
                          style={{ height: `${manualPercentage}%`, minHeight: data.manualLeads > 0 ? '20px' : '0' }}
                        >
                          {data.manualLeads > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-white font-bold text-sm">{data.manualLeads}</span>
                            </div>
                          )}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                            Manual: {data.manualLeads}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center mt-2">
                      <p className="text-sm font-semibold text-gray-700">{data.weekLabel}</p>
                      <p className="text-xs text-gray-500">{data.sales} ventas</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-gray-200 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-t from-blue-500 to-blue-400 rounded"></div>
                <span className="text-gray-600">Leads Meta</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-t from-green-500 to-green-400 rounded"></div>
                <span className="text-gray-600">Leads Manuales</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-50 rounded-lg">
            <Database className="text-purple-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Comparación Mensual (Últimos 6 Meses)</h3>
            <p className="text-sm text-gray-600">Evolución de leads por mes</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-end justify-around gap-4 h-80 pb-4">
            {monthlyData.map((data, index) => {
              const totalLeads = data.manualLeads + data.metaLeads;
              const metaPercentage = totalLeads > 0 ? (data.metaLeads / maxMonthlyLeads) * 100 : 0;
              const manualPercentage = totalLeads > 0 ? (data.manualLeads / maxMonthlyLeads) * 100 : 0;

              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-center mb-2">
                    <p className="text-lg font-bold text-gray-900">{totalLeads}</p>
                    <p className="text-xs text-gray-500">total</p>
                  </div>
                  <div className="w-full flex gap-1 items-end justify-center" style={{ height: '240px' }}>
                    <div className="relative flex flex-col justify-end w-1/2 h-full">
                      <div
                        className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-lg transition-all duration-500 hover:from-purple-600 hover:to-purple-500 shadow-lg relative group"
                        style={{ height: `${metaPercentage}%`, minHeight: data.metaLeads > 0 ? '20px' : '0' }}
                      >
                        {data.metaLeads > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{data.metaLeads}</span>
                          </div>
                        )}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                          Meta: {data.metaLeads}
                        </div>
                      </div>
                    </div>
                    <div className="relative flex flex-col justify-end w-1/2 h-full">
                      <div
                        className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-lg transition-all duration-500 hover:from-orange-600 hover:to-orange-500 shadow-lg relative group"
                        style={{ height: `${manualPercentage}%`, minHeight: data.manualLeads > 0 ? '20px' : '0' }}
                      >
                        {data.manualLeads > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{data.manualLeads}</span>
                          </div>
                        )}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                          Manual: {data.manualLeads}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-center mt-2">
                    <p className="text-sm font-semibold text-gray-700">{data.month}</p>
                    <p className="text-xs text-gray-500">{data.sales} ventas</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-gray-200 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-t from-purple-500 to-purple-400 rounded"></div>
              <span className="text-gray-600">Leads Meta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-t from-orange-500 to-orange-400 rounded"></div>
              <span className="text-gray-600">Leads Manuales</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-50 rounded-lg">
            <TrendingUp className="text-green-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Facturación Mensual (Últimos 6 Meses)</h3>
            <p className="text-sm text-gray-600">Evolución de ingresos por mes</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-end justify-around gap-4 h-80 pb-4">
            {monthlyData.map((data, index) => {
              const revenuePercentage = data.revenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;

              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-center mb-2">
                    <p className="text-base font-bold text-gray-900">${data.revenue.toFixed(0)}</p>
                    <p className="text-xs text-gray-500">facturado</p>
                  </div>
                  <div className="relative flex flex-col justify-end w-full h-full" style={{ height: '240px' }}>
                    <div
                      className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t-lg transition-all duration-500 hover:from-green-700 hover:to-green-500 shadow-lg relative group"
                      style={{ height: `${revenuePercentage}%`, minHeight: data.revenue > 0 ? '20px' : '0' }}
                    >
                      {data.revenue > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white font-bold text-xs">${data.revenue.toFixed(0)}</span>
                        </div>
                      )}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                        Cash: ${data.cashCollected.toFixed(0)} ({data.revenue > 0 ? ((data.cashCollected / data.revenue) * 100).toFixed(0) : 0}%)
                      </div>
                    </div>
                  </div>
                  <div className="text-center mt-2">
                    <p className="text-sm font-semibold text-gray-700">{data.month}</p>
                    <p className="text-xs text-gray-500">${data.cashCollected.toFixed(0)} cobrado</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {monthlyData.slice(-3).map((data, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">{data.month}</p>
                  <p className="text-lg font-bold text-gray-900">${data.revenue.toFixed(0)}</p>
                  <p className="text-xs text-green-600">
                    {data.revenue > 0 ? ((data.cashCollected / data.revenue) * 100).toFixed(0) : 0}% cobrado
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
