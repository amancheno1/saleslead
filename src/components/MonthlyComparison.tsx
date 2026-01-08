import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProject } from '../context/ProjectContext';
import LeadsModal from './LeadsModal';
import type { Database as DB } from '../lib/database.types';

type Lead = DB['public']['Tables']['leads']['Row'];
type MetaLead = DB['public']['Tables']['meta_leads']['Row'];

interface MonthlyComparisonProps {
  refreshTrigger: number;
  leads: Lead[];
}

export default function MonthlyComparison({ refreshTrigger, leads: propsLeads }: MonthlyComparisonProps) {
  const { currentProject } = useProject();
  const [leads, setLeads] = useState<Lead[]>(propsLeads);
  const [metaLeads, setMetaLeads] = useState<MetaLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubtitle, setModalSubtitle] = useState('');

  useEffect(() => {
    setLeads(propsLeads);
  }, [propsLeads]);

  useEffect(() => {
    if (currentProject) {
      fetchData();
    }
  }, [refreshTrigger, currentProject]);

  const fetchData = async () => {
    if (!currentProject) return;

    try {
      const metaLeadsResponse = await supabase
        .from('meta_leads')
        .select('*')
        .eq('project_id', currentProject.id);

      if (metaLeadsResponse.error) throw metaLeadsResponse.error;

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

  const getMonthName = (month: number) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month];
  };

  const calculateWeeklyData = () => {
    const currentYear = selectedYear;
    const currentMonth = selectedMonth;

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
        year: number;
        monthIndex: number;
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
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
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

  const handleWeekClick = (weekIndex: number) => {
    const getMonday = (date: Date) => {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(date.setDate(diff));
    };

    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
    const monday = getMonday(new Date(firstDayOfMonth));

    const weekStart = new Date(monday);
    weekStart.setDate(weekStart.getDate() + (weekIndex * 7));

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekLeads = leads.filter(lead => {
      const entryDate = new Date(lead.entry_date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });

    setModalTitle(`Semana ${weekIndex + 1} - ${getMonthName(selectedMonth)} ${selectedYear}`);
    setModalSubtitle(`${weekStart.toLocaleDateString('es-ES')} - ${weekEnd.toLocaleDateString('es-ES')}`);
    setSelectedLeads(weekLeads);
    setModalOpen(true);
  };

  const handleMonthClick = (year: number, monthIndex: number) => {
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);

    const monthLeads = leads.filter(lead => {
      const entryDate = new Date(lead.entry_date);
      return entryDate >= monthStart && entryDate <= monthEnd;
    });

    const monthName = monthStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    setModalTitle(monthName.charAt(0).toUpperCase() + monthName.slice(1));
    setModalSubtitle(`${monthStart.toLocaleDateString('es-ES')} - ${monthEnd.toLocaleDateString('es-ES')}`);
    setSelectedLeads(monthLeads);
    setModalOpen(true);
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
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
          <div className="p-3 bg-blue-50 rounded-lg shrink-0">
            <BarChart3 className="text-blue-600" size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">Comparación Semanal</h3>
            <p className="text-xs md:text-sm text-gray-600">Meta vs Manuales</p>
          </div>
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
        </div>

        {weeklyData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay datos para mostrar</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
              <div className="flex items-end justify-around gap-2 md:gap-4 min-w-[500px] md:min-w-0 h-64 md:h-80 pb-4">
                {weeklyData.map((data, index) => {
                  const totalLeads = data.manualLeads + data.metaLeads;
                  const metaPercentage = totalLeads > 0 ? (data.metaLeads / maxWeeklyLeads) * 100 : 0;
                  const manualPercentage = totalLeads > 0 ? (data.manualLeads / maxWeeklyLeads) * 100 : 0;

                  return (
                    <div
                      key={index}
                      onClick={() => handleWeekClick(index)}
                      className="flex-1 flex flex-col items-center gap-1 md:gap-2 min-w-[70px] cursor-pointer transition-transform hover:scale-105"
                    >
                      <div className="text-center mb-2 md:mb-4">
                        <p className="text-base md:text-lg font-bold text-gray-900">{totalLeads}</p>
                        <p className="text-xs text-gray-500">total</p>
                      </div>
                      <div className="w-full flex gap-0.5 md:gap-1 items-end justify-center h-32 md:h-48">
                        <div className="relative flex flex-col justify-end w-1/2 h-full">
                          <div
                            className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-600 hover:to-blue-500 shadow-lg relative group"
                            style={{ height: `${metaPercentage}%`, minHeight: data.metaLeads > 0 ? '20px' : '0' }}
                          >
                            {data.metaLeads > 0 && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white font-bold text-xs md:text-sm">{data.metaLeads}</span>
                              </div>
                            )}
                            <div className="hidden md:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
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
                                <span className="text-white font-bold text-xs md:text-sm">{data.manualLeads}</span>
                              </div>
                            )}
                            <div className="hidden md:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                              Manual: {data.manualLeads}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-center mt-1 md:mt-2">
                        <p className="text-xs md:text-sm font-semibold text-gray-700">{data.weekLabel}</p>
                        <p className="text-xs text-gray-500">{data.sales}v</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 flex items-center justify-center flex-wrap gap-4 md:gap-6 text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-gradient-to-t from-blue-500 to-blue-400 rounded"></div>
                <span className="text-gray-600">Meta</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-gradient-to-t from-green-500 to-green-400 rounded"></div>
                <span className="text-gray-600">Manuales</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6 md:mb-8">
          <div className="p-3 bg-blue-50 rounded-lg shrink-0">
            <Database className="text-blue-600" size={24} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">Comparación Mensual (6 Meses)</h3>
            <p className="text-xs md:text-sm text-gray-600">Evolución histórica</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
            <div className="flex items-end justify-around gap-2 md:gap-4 min-w-[600px] md:min-w-0 h-64 md:h-80 pb-4 pt-4 md:pt-8">
              {monthlyData.map((data, index) => {
                const totalLeads = data.manualLeads + data.metaLeads;
                const metaPercentage = totalLeads > 0 ? (data.metaLeads / maxMonthlyLeads) * 100 : 0;
                const manualPercentage = totalLeads > 0 ? (data.manualLeads / maxMonthlyLeads) * 100 : 0;

                return (
                  <div
                    key={index}
                    onClick={() => handleMonthClick(data.year, data.monthIndex)}
                    className="flex-1 flex flex-col items-center gap-1 md:gap-2 min-w-[80px] cursor-pointer transition-transform hover:scale-105"
                  >
                    <div className="text-center mb-1 md:mb-2">
                      <p className="text-sm md:text-base font-bold text-gray-900">{totalLeads}</p>
                      <p className="text-xs text-gray-500">total</p>
                    </div>
                    <div className="w-full flex gap-0.5 md:gap-1 items-end justify-center h-32 md:h-44">
                      <div className="relative flex flex-col justify-end w-1/2 h-full">
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-600 hover:to-blue-500 shadow-lg relative group"
                          style={{ height: `${metaPercentage}%`, minHeight: data.metaLeads > 0 ? '20px' : '0' }}
                        >
                          {data.metaLeads > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-white font-bold text-xs md:text-sm">{data.metaLeads}</span>
                            </div>
                          )}
                          <div className="hidden md:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
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
                              <span className="text-white font-bold text-xs md:text-sm">{data.manualLeads}</span>
                            </div>
                          )}
                          <div className="hidden md:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                            Manual: {data.manualLeads}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center mt-1 md:mt-2">
                      <p className="text-xs md:text-sm font-semibold text-gray-700">{data.month}</p>
                      <p className="text-xs text-gray-500">{data.sales}v</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex items-center justify-center flex-wrap gap-4 md:gap-6 text-xs md:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 md:w-4 md:h-4 bg-gradient-to-t from-blue-500 to-blue-400 rounded"></div>
              <span className="text-gray-600">Meta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 md:w-4 md:h-4 bg-gradient-to-t from-orange-500 to-orange-400 rounded"></div>
              <span className="text-gray-600">Manuales</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6 md:mb-8">
          <div className="p-3 bg-green-50 rounded-lg shrink-0">
            <TrendingUp className="text-green-600" size={24} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">Facturación (6 Meses)</h3>
            <p className="text-xs md:text-sm text-gray-600">Ingresos mensuales</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
            <div className="flex items-end justify-around gap-2 md:gap-4 min-w-[600px] md:min-w-0 h-64 md:h-80 pb-4 pt-4 md:pt-8">
              {monthlyData.map((data, index) => {
                const revenuePercentage = data.revenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;

                return (
                  <div
                    key={index}
                    onClick={() => handleMonthClick(data.year, data.monthIndex)}
                    className="flex-1 flex flex-col items-center gap-1 md:gap-2 min-w-[80px] cursor-pointer transition-transform hover:scale-105"
                  >
                    <div className="text-center mb-1 md:mb-2">
                      <p className="text-xs md:text-sm font-bold text-gray-900">€{data.revenue.toFixed(0)}</p>
                      <p className="text-xs text-gray-500">total</p>
                    </div>
                    <div className="relative flex flex-col justify-end w-full h-32 md:h-44">
                      <div
                        className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t-lg transition-all duration-500 hover:from-green-700 hover:to-green-500 shadow-lg relative group"
                        style={{ height: `${revenuePercentage}%`, minHeight: data.revenue > 0 ? '20px' : '0' }}
                      >
                        {data.revenue > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white font-bold text-xs">€{data.revenue.toFixed(0)}</span>
                          </div>
                        )}
                        <div className="hidden md:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                          Cash: €{data.cashCollected.toFixed(0)} ({data.revenue > 0 ? ((data.cashCollected / data.revenue) * 100).toFixed(0) : 0}%)
                        </div>
                      </div>
                    </div>
                    <div className="text-center mt-1 md:mt-2">
                      <p className="text-xs md:text-sm font-semibold text-gray-700">{data.month}</p>
                      <p className="text-xs text-gray-500">€{data.cashCollected.toFixed(0)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {monthlyData.slice(-3).map((data, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">{data.month}</p>
                  <p className="text-base md:text-lg font-bold text-gray-900">€{data.revenue.toFixed(0)}</p>
                  <p className="text-xs text-green-600">
                    {data.revenue > 0 ? ((data.cashCollected / data.revenue) * 100).toFixed(0) : 0}% cobrado
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <LeadsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        leads={selectedLeads}
        title={modalTitle}
        subtitle={modalSubtitle}
      />
    </div>
  );
}
