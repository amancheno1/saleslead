import { useState, useEffect } from 'react';
import { TrendingUp, Users, Calendar, DollarSign, Target, Phone, CheckCircle, XCircle, Clock, BarChart3, Zap, ArrowUp, Activity, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useProject } from '../context/ProjectContext';
import MonthlyComparison from './MonthlyComparison';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];
type MetaLead = Database['public']['Tables']['meta_leads']['Row'];

interface DashboardProps {
  refreshTrigger: number;
}

export default function Dashboard({ refreshTrigger }: DashboardProps) {
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

  const calculateMetrics = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyLeads = leads.filter(lead => {
      const entryDate = new Date(lead.entry_date);
      return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
    });

    const weeklyGoal = currentProject?.weekly_goal || 50;
    const monthlyGoal = weeklyGoal * 4;
    const totalLeads = monthlyLeads.length;
    const scheduled = monthlyLeads.filter(l => l.scheduled_call_date).length;
    const attended = monthlyLeads.filter(l => l.attended_meeting === true).length;
    const cancelled = monthlyLeads.filter(l => l.attended_meeting === false && l.scheduled_call_date).length;
    const noShow = monthlyLeads.filter(l => l.attended_meeting === false).length;
    const offersGiven = monthlyLeads.filter(l => l.result && l.result !== 'no').length;
    const sales = monthlyLeads.filter(l => l.sale_made).length;
    const totalRevenue = monthlyLeads.reduce((sum, l) => sum + (l.sale_amount || 0), 0);
    const totalCashCollected = monthlyLeads.reduce((sum, l) => sum + (l.cash_collected || 0), 0);

    const scheduledRate = monthlyGoal > 0 ? (scheduled / monthlyGoal) * 100 : 0;
    const showRate = scheduled > 0 ? (attended / scheduled) * 100 : 0;
    const closeRate = scheduled > 0 ? (sales / scheduled) * 100 : 0;

    const getMonday = (date: Date) => {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(date.setDate(diff));
    };

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const monday = getMonday(new Date(firstDayOfMonth));

    const leadsByWeek: { week: number; manualLeads: number; metaLeads: number; totalLeads: number; goal: number; percentage: number }[] = [];

    for (let i = 0; i < 6; i++) {
      const weekStart = new Date(monday);
      weekStart.setDate(weekStart.getDate() + (i * 7));

      if (weekStart > lastDayOfMonth) break;

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekManualLeads = monthlyLeads.filter(lead => {
        const entryDate = new Date(lead.entry_date);
        return entryDate >= weekStart && entryDate <= weekEnd;
      }).length;

      let weekMetaLeads = 0;
      metaLeads.forEach(metaLead => {
        const metaDate = new Date(metaLead.week_start_date);
        if (metaDate >= weekStart && metaDate <= weekEnd) {
          weekMetaLeads += metaLead.leads_count;
        }
      });

      const totalWeekLeads = weekManualLeads + weekMetaLeads;

      leadsByWeek.push({
        week: i + 1,
        manualLeads: weekManualLeads,
        metaLeads: weekMetaLeads,
        totalLeads: totalWeekLeads,
        goal: weeklyGoal,
        percentage: weeklyGoal > 0 ? (totalWeekLeads / weeklyGoal) * 100 : 0
      });
    }

    return {
      weeklyGoal,
      monthlyGoal,
      totalLeads,
      scheduled,
      attended,
      cancelled,
      noShow,
      offersGiven,
      sales,
      totalRevenue,
      totalCashCollected,
      scheduledRate,
      showRate,
      closeRate,
      leadsByWeek
    };
  };

  const exportDashboardToExcel = () => {
    const metrics = calculateMetrics();
    const currentMonth = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const wb = XLSX.utils.book_new();

    const infoData = [
      ['Sistema de Gestión de Leads'],
      [''],
      ['Propiedad de:', 'Alejandro Mancheño Rey'],
      ['Fecha de Generación:', new Date().toLocaleDateString('es-ES')],
      ['Tipo de Informe:', 'Dashboard - Métricas del Mes'],
      ['Periodo:', currentMonth],
      [''],
      ['© ' + new Date().getFullYear() + ' Alejandro Mancheño Rey. Todos los derechos reservados.']
    ];

    const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Información');

    const summaryData = [
      { 'Métrica': 'Meta Semanal', 'Valor': metrics.weeklyGoal },
      { 'Métrica': 'Meta Mensual', 'Valor': metrics.monthlyGoal },
      { 'Métrica': 'Total Leads', 'Valor': metrics.totalLeads },
      { 'Métrica': 'Llamadas Agendadas', 'Valor': metrics.scheduled },
      { 'Métrica': 'Llamadas Asistidas', 'Valor': metrics.attended },
      { 'Métrica': 'Llamadas Canceladas', 'Valor': metrics.cancelled },
      { 'Métrica': 'No Show', 'Valor': metrics.noShow },
      { 'Métrica': 'Ofertas Realizadas', 'Valor': metrics.offersGiven },
      { 'Métrica': 'Ventas Cerradas', 'Valor': metrics.sales },
      { 'Métrica': 'Facturación Total', 'Valor': `$${metrics.totalRevenue.toFixed(2)}` },
      { 'Métrica': 'Cash Collected', 'Valor': `$${metrics.totalCashCollected.toFixed(2)}` },
      { 'Métrica': 'Tasa de Agendamiento', 'Valor': `${metrics.scheduledRate.toFixed(1)}%` },
      { 'Métrica': 'Show Rate', 'Valor': `${metrics.showRate.toFixed(1)}%` },
      { 'Métrica': 'Close Rate', 'Valor': `${metrics.closeRate.toFixed(1)}%` },
      { 'Métrica': '$ Por Lead', 'Valor': metrics.totalLeads > 0 ? `$${(metrics.totalRevenue / metrics.totalLeads).toFixed(2)}` : '$0' }
    ];

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    const weeklyData = metrics.leadsByWeek.map(week => ({
      'Semana': `Semana ${week.week}`,
      'Leads Meta': week.metaLeads,
      'Leads Manuales': week.manualLeads,
      'Total Leads': week.totalLeads,
      'Meta': week.goal,
      'Cumplimiento': `${week.percentage.toFixed(1)}%`
    }));

    const totalRow = {
      'Semana': 'TOTAL DEL MES',
      'Leads Meta': metrics.leadsByWeek.reduce((sum, w) => sum + w.metaLeads, 0),
      'Leads Manuales': metrics.leadsByWeek.reduce((sum, w) => sum + w.manualLeads, 0),
      'Total Leads': metrics.leadsByWeek.reduce((sum, w) => sum + w.totalLeads, 0),
      'Meta': metrics.monthlyGoal,
      'Cumplimiento': `${((metrics.leadsByWeek.reduce((sum, w) => sum + w.totalLeads, 0) / metrics.monthlyGoal) * 100).toFixed(1)}%`
    };

    weeklyData.push(totalRow);

    const wsWeekly = XLSX.utils.json_to_sheet(weeklyData);
    XLSX.utils.book_append_sheet(wb, wsWeekly, 'Desglose Semanal');

    const fileName = `Dashboard_${currentMonth.replace(' ', '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const metrics = calculateMetrics();
  const currentMonthName = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8 pb-8">
      <div className="flex justify-end mb-4">
        <button
          onClick={exportDashboardToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg"
        >
          <Download size={18} />
          Exportar Dashboard
        </button>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 rounded-3xl shadow-2xl p-8 md:p-12">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full mb-6 border border-white/30">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
                <span className="text-sm font-bold text-white uppercase tracking-wider">En Vivo</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-3 text-white tracking-tight capitalize">
                {currentMonthName}
              </h1>
              <p className="text-lg md:text-xl text-blue-100 font-medium">Dashboard de Rendimiento en Tiempo Real</p>
            </div>

            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative bg-white/20 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl">
                  <div className="text-center">
                    <p className="text-sm font-bold text-blue-100 uppercase tracking-wider mb-2">Total Leads</p>
                    <p className="text-6xl md:text-7xl font-black text-white mb-3">{metrics.totalLeads}</p>
                    <div className="flex items-center justify-center gap-3">
                      <div className="h-2 w-32 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full transition-all duration-1000 shadow-lg"
                          style={{ width: `${Math.min((metrics.totalLeads / metrics.monthlyGoal) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-black text-white">{((metrics.totalLeads / metrics.monthlyGoal) * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-xs text-blue-200 mt-2 font-medium">de {metrics.monthlyGoal} meta mensual</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="relative bg-white rounded-3xl shadow-xl p-8 border border-gray-100 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-transparent rounded-full -mr-32 -mt-32"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                    <Target className="text-white" size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900">Metas y Progreso</h2>
                    <p className="text-sm text-gray-600 font-medium">Seguimiento semanal detallado</p>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl p-6 mb-8 shadow-2xl">
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-bold text-white/90 uppercase tracking-wide mb-1">Meta Mensual Total</p>
                        <p className="text-xs text-white/70 font-medium">4 semanas × {metrics.weeklyGoal} leads semanales</p>
                      </div>
                      <div className="text-right">
                        <p className="text-5xl font-black text-white">{metrics.totalLeads}</p>
                        <p className="text-sm text-white/80 font-bold">de {metrics.monthlyGoal} leads</p>
                      </div>
                    </div>
                    <div className="relative h-8 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                      <div
                        className={`absolute h-full rounded-full transition-all duration-1000 shadow-lg ${
                          (metrics.totalLeads / metrics.monthlyGoal) * 100 >= 100
                            ? 'bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500'
                            : 'bg-gradient-to-r from-white via-blue-100 to-cyan-200'
                        }`}
                        style={{ width: `${Math.min((metrics.totalLeads / metrics.monthlyGoal) * 100, 100)}%` }}
                      >
                        <div className="flex items-center justify-center h-full">
                          <span className="text-sm font-black text-blue-900">
                            {((metrics.totalLeads / metrics.monthlyGoal) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-wide">Desglose Semanal</h3>
                  {metrics.leadsByWeek.map((weekData, index) => (
                    <div key={weekData.week} className="group relative overflow-hidden bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-5 border-2 border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-md opacity-50"></div>
                              <div className="relative w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <span className="text-white text-xl font-black">{weekData.week}</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-base font-black text-gray-900">Semana {weekData.week}</p>
                              <p className="text-sm text-gray-600 font-semibold">Meta: {weekData.goal} leads</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-4xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{weekData.totalLeads}</p>
                            <p className="text-xs text-gray-600 font-semibold">
                              <span className="text-blue-600">{weekData.metaLeads} Meta</span> + <span className="text-green-600">{weekData.manualLeads} Manual</span>
                            </p>
                            <div className="flex items-center gap-1 justify-end mt-1">
                              {weekData.percentage >= 100 && <ArrowUp size={14} className="text-green-600" />}
                              <p className={`text-sm font-black ${
                                weekData.percentage >= 100 ? 'text-green-600' :
                                weekData.percentage >= 80 ? 'text-orange-600' : 'text-red-600'
                              }`}>
                                {weekData.percentage.toFixed(0)}% cumplido
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`absolute h-full rounded-full transition-all duration-1000 shadow-lg ${
                              weekData.percentage >= 100 ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500' :
                              weekData.percentage >= 80 ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500' :
                              'bg-gradient-to-r from-red-500 via-rose-500 to-pink-500'
                            }`}
                            style={{ width: `${Math.min(weekData.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 shadow-2xl mt-6">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-white/90 uppercase tracking-wide mb-2">Total del Mes</p>
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-xs text-white/70 mb-1">Leads Meta</p>
                              <p className="text-2xl font-black text-blue-200">{metrics.leadsByWeek.reduce((sum, w) => sum + w.metaLeads, 0)}</p>
                            </div>
                            <div className="text-white/50 text-3xl font-black">+</div>
                            <div>
                              <p className="text-xs text-white/70 mb-1">Leads Manuales</p>
                              <p className="text-2xl font-black text-green-200">{metrics.leadsByWeek.reduce((sum, w) => sum + w.manualLeads, 0)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-white/70 mb-2">Total General</p>
                          <p className="text-6xl font-black text-white mb-2">{metrics.leadsByWeek.reduce((sum, w) => sum + w.totalLeads, 0)}</p>
                          <p className="text-sm text-white/80 font-bold">de {metrics.monthlyGoal} meta mensual</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="relative bg-white rounded-3xl shadow-xl p-8 border border-gray-100 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-50 to-transparent rounded-full -mr-32 -mt-32"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg">
                    <Phone className="text-white" size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900">Llamadas y Conversión</h2>
                    <p className="text-sm text-gray-600 font-medium">Embudo de ventas completo</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group/card overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-5 border-2 border-orange-200 hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 text-orange-200 opacity-20">
                      <Phone size={80} />
                    </div>
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Agendadas</p>
                      <p className="text-4xl font-black text-orange-600 mb-1">{metrics.scheduled}</p>
                      <p className="text-xs text-gray-600 font-semibold">{metrics.scheduledRate.toFixed(0)}% de meta</p>
                    </div>
                  </div>

                  <div className="relative group/card overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-5 border-2 border-green-200 hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 text-green-200 opacity-20">
                      <CheckCircle size={80} />
                    </div>
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Asistidas</p>
                      <p className="text-4xl font-black text-green-600 mb-1">{metrics.attended}</p>
                      <p className="text-xs text-gray-600 font-semibold">{metrics.showRate.toFixed(0)}% show rate</p>
                    </div>
                  </div>

                  <div className="relative group/card overflow-hidden bg-gradient-to-br from-red-50 to-rose-100 rounded-2xl p-5 border-2 border-red-200 hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 text-red-200 opacity-20">
                      <XCircle size={80} />
                    </div>
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Canceladas</p>
                      <p className="text-4xl font-black text-red-600">{metrics.cancelled}</p>
                    </div>
                  </div>

                  <div className="relative group/card overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-5 border-2 border-gray-300 hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 text-gray-300 opacity-30">
                      <Clock size={80} />
                    </div>
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">No Show</p>
                      <p className="text-4xl font-black text-gray-700">{metrics.noShow}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t-2 border-gray-200">
                  <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-5 border-2 border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                        <Zap className="text-white" size={24} />
                      </div>
                      <span className="text-base font-black text-gray-900">Ofertas Realizadas</span>
                    </div>
                    <span className="text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{metrics.offersGiven}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="relative bg-white rounded-3xl shadow-xl p-8 border border-gray-100 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-50 to-transparent rounded-full -mr-32 -mt-32"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                    <DollarSign className="text-white" size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900">Facturación</h2>
                    <p className="text-sm text-gray-600 font-medium">Resultados económicos del mes</p>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 rounded-2xl p-8 mb-6 shadow-2xl">
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="absolute top-0 right-0 text-white/10">
                    <CheckCircle size={200} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white/90 uppercase tracking-wide mb-2">Ventas Cerradas</p>
                        <p className="text-6xl font-black text-white mb-2">{metrics.sales}</p>
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                          <TrendingUp size={16} className="text-white" />
                          <p className="text-sm text-white font-bold">{metrics.closeRate.toFixed(1)}% tasa de cierre</p>
                        </div>
                      </div>
                      <div className="hidden md:block">
                        <CheckCircle className="text-white/30" size={120} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200 hover:shadow-lg transition-all duration-300">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Facturación Total</p>
                    <p className="text-3xl font-black text-blue-600">${metrics.totalRevenue.toFixed(0)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 border-2 border-green-200 hover:shadow-lg transition-all duration-300">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Cash Collected</p>
                    <p className="text-3xl font-black text-green-600">${metrics.totalCashCollected.toFixed(0)}</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t-2 border-gray-200">
                  <div className="flex justify-between items-center bg-gray-50 rounded-2xl p-5">
                    <span className="text-base font-black text-gray-700 uppercase tracking-wide">% Cobrado</span>
                    <span className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {metrics.totalRevenue > 0
                        ? ((metrics.totalCashCollected / metrics.totalRevenue) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="relative bg-white rounded-3xl shadow-xl p-6 border border-gray-100 sticky top-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg">
                  <Activity className="text-white" size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">KPIs Clave</h2>
                  <p className="text-xs text-gray-600 font-medium">Métricas en tiempo real</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="relative overflow-hidden group/kpi bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="absolute top-0 right-0 text-white/10">
                    <Users size={100} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-white/80 uppercase tracking-wider">Leads</span>
                      <Users size={20} className="text-white/80" />
                    </div>
                    <p className="text-5xl font-black text-white mb-2">{metrics.totalLeads}</p>
                    <p className="text-sm text-white/80 font-bold">de {metrics.monthlyGoal} meta</p>
                  </div>
                </div>

                <div className="relative overflow-hidden group/kpi bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="absolute top-0 right-0 text-white/10">
                    <CheckCircle size={100} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-white/80 uppercase tracking-wider">Show Rate</span>
                      <CheckCircle size={20} className="text-white/80" />
                    </div>
                    <p className="text-5xl font-black text-white mb-2">{metrics.showRate.toFixed(1)}%</p>
                    <p className="text-sm text-white/80 font-bold">{metrics.attended} de {metrics.scheduled}</p>
                  </div>
                </div>

                <div className="relative overflow-hidden group/kpi bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="absolute top-0 right-0 text-white/10">
                    <Target size={100} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-white/80 uppercase tracking-wider">Close Rate</span>
                      <Target size={20} className="text-white/80" />
                    </div>
                    <p className="text-5xl font-black text-white mb-2">{metrics.closeRate.toFixed(1)}%</p>
                    <p className="text-sm text-white/80 font-bold">{metrics.sales} de {metrics.scheduled} agendadas</p>
                  </div>
                </div>

                <div className="relative overflow-hidden group/kpi bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="absolute top-0 right-0 text-white/10">
                    <DollarSign size={100} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-white/80 uppercase tracking-wider">$ Por Lead</span>
                      <DollarSign size={20} className="text-white/80" />
                    </div>
                    <p className="text-5xl font-black text-white mb-2">
                      ${metrics.totalLeads > 0 ? (metrics.totalRevenue / metrics.totalLeads).toFixed(0) : 0}
                    </p>
                    <p className="text-sm text-white/80 font-bold">promedio</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
        <div className="relative bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
              <BarChart3 className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900">Comparación Histórica</h2>
              <p className="text-sm text-gray-600 font-medium">Evolución de los últimos 6 meses</p>
            </div>
          </div>
          <MonthlyComparison refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}
