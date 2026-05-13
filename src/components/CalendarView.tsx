import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Phone, Clock, CheckCircle, XCircle, User, Calendar as CalendarIcon, MessageCircle, Mail, X, Plus, Trash2, CreditCard as Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import ContactDetail from './ContactDetail';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];
type FollowUp = Database['public']['Tables']['follow_ups']['Row'];
type Appointment = Database['public']['Tables']['appointments']['Row'];

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: 'scheduled_call' | 'follow_up' | 'appointment';
  status?: string;
  lead?: Lead;
  followUp?: FollowUp & { leads?: { first_name: string; last_name: string; phone?: string; email?: string } };
  appointment?: Appointment;
}

export default function CalendarView() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [contactDetailLead, setContactDetailLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({ lead_id: '', title: '', start_time: '', description: '' });
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (currentProject) fetchEvents();
  }, [currentProject, currentDate]);

  const fetchEvents = async () => {
    if (!currentProject) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

    try {
      const [leadsRes, followUpsRes, appointmentsRes, allLeadsRes] = await Promise.all([
        supabase
          .from('leads')
          .select('*')
          .eq('project_id', currentProject.id)
          .not('scheduled_call_date', 'is', null)
          .gte('scheduled_call_date', firstDay)
          .lte('scheduled_call_date', lastDay),
        supabase
          .from('follow_ups')
          .select('*, leads(first_name, last_name, phone, email)')
          .eq('project_id', currentProject.id)
          .gte('scheduled_date', firstDay)
          .lte('scheduled_date', lastDay),
        supabase
          .from('appointments')
          .select('*')
          .eq('project_id', currentProject.id)
          .gte('date', firstDay)
          .lte('date', lastDay),
        supabase
          .from('leads')
          .select('*')
          .eq('project_id', currentProject.id)
          .order('first_name'),
      ]);

      setLeads(allLeadsRes.data || []);
      const calendarEvents: CalendarEvent[] = [];

      if (leadsRes.data) {
        leadsRes.data.forEach((lead: any) => {
          if (lead.scheduled_call_date) {
            calendarEvents.push({
              id: `lead-${lead.id}`,
              title: `${lead.first_name} ${lead.last_name}`,
              date: lead.scheduled_call_date,
              type: 'scheduled_call',
              status: lead.attended_meeting || 'pending',
              lead,
            });
          }
        });
      }

      if (followUpsRes.data) {
        followUpsRes.data.forEach((fu: any) => {
          calendarEvents.push({
            id: `fu-${fu.id}`,
            title: fu.leads ? `${fu.leads.first_name} ${fu.leads.last_name}` : 'Seguimiento',
            date: fu.scheduled_date,
            time: fu.scheduled_time,
            type: 'follow_up',
            status: fu.status,
            followUp: fu,
          });
        });
      }

      if (appointmentsRes.data) {
        appointmentsRes.data.forEach((apt: any) => {
          const lead = allLeadsRes.data?.find(l => l.id === apt.lead_id);
          calendarEvents.push({
            id: `apt-${apt.id}`,
            title: apt.title,
            date: apt.date,
            time: apt.start_time,
            type: 'appointment',
            status: apt.status,
            appointment: apt,
            lead,
          });
        });
      }

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async () => {
    if (!currentProject || !user || !appointmentForm.lead_id || !appointmentForm.title || !selectedDate || !appointmentForm.start_time) return;

    const { error } = await supabase.from('appointments').insert({
      project_id: currentProject.id,
      lead_id: appointmentForm.lead_id,
      user_id: user.id,
      title: appointmentForm.title,
      date: selectedDate,
      start_time: appointmentForm.start_time,
      description: appointmentForm.description || null,
    });

    if (!error) {
      setShowNewAppointment(false);
      setAppointmentForm({ lead_id: '', title: '', start_time: '', description: '' });
      fetchEvents();
    }
  };

  const updateAppointment = async () => {
    if (!editingAppointment) return;
    const { error } = await supabase.from('appointments').update({
      title: appointmentForm.title,
      start_time: appointmentForm.start_time,
      description: appointmentForm.description || null,
    }).eq('id', editingAppointment.id);

    if (!error) {
      setEditingAppointment(null);
      setAppointmentForm({ lead_id: '', title: '', start_time: '', description: '' });
      fetchEvents();
    }
  };

  const deleteAppointment = async (aptId: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', aptId);
    if (!error) {
      setSelectedEvent(null);
      fetchEvents();
    }
  };

  const updateAppointmentStatus = async (aptId: string, status: string) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', aptId);
    if (!error) fetchEvents();
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const selectedDateEvents = selectedDate ? events.filter(e => e.date === selectedDate) : [];

  const getStatusColor = (status: string | undefined, type: string) => {
    if (type === 'appointment') {
      switch (status) {
        case 'completed': return 'bg-green-500';
        case 'cancelled': return 'bg-gray-400';
        default: return 'bg-teal-500';
      }
    }
    switch (status) {
      case 'si': return 'bg-green-500';
      case 'no_show': return 'bg-red-500';
      case 'cancelada': return 'bg-gray-500';
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-blue-500';
      case 'skipped': return 'bg-gray-400';
      default: return 'bg-blue-500';
    }
  };

  const getStatusLabel = (event: CalendarEvent) => {
    if (event.type === 'appointment') {
      switch (event.status) {
        case 'completed': return 'Completada';
        case 'cancelled': return 'Cancelada';
        default: return 'Agendada';
      }
    }
    if (event.type === 'scheduled_call') {
      switch (event.status) {
        case 'si': return 'Asistida';
        case 'no_show': return 'No Show';
        case 'cancelada': return 'Cancelada';
        default: return 'Pendiente';
      }
    }
    switch (event.status) {
      case 'completed': return 'Completado';
      case 'skipped': return 'Omitido';
      default: return 'Pendiente';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'scheduled_call': return 'Llamada';
      case 'follow_up': return 'Seguimiento';
      case 'appointment': return 'Cita';
      default: return type;
    }
  };

  const getContactPhone = (event: CalendarEvent): string | null => {
    if (event.lead?.phone) return event.lead.phone;
    if (event.followUp?.leads?.phone) return event.followUp.leads.phone;
    return null;
  };

  const getContactEmail = (event: CalendarEvent): string | null => {
    if (event.lead?.email) return event.lead.email;
    if (event.followUp?.leads?.email) return event.followUp.leads.email;
    return null;
  };

  const openWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone.replace(/[^0-9+]/g, '')}`, '_blank');
  };

  const openEmail = (email: string, name: string) => {
    window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodeURIComponent(`Seguimiento - ${name}`)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={prevMonth} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                    <ChevronLeft size={20} className="text-white" />
                  </button>
                  <h2 className="text-xl font-black text-white capitalize">{monthName}</h2>
                  <button onClick={nextMonth} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                    <ChevronRight size={20} className="text-white" />
                  </button>
                </div>
                <button
                  onClick={goToToday}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Hoy
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(day => (
                  <div key={day} className="text-center text-xs font-bold text-gray-500 uppercase py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const dayEvents = getEventsForDate(day);
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = selectedDate === dateStr;

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`aspect-square p-1 rounded-xl cursor-pointer transition-all border-2 ${
                        isToday(day)
                          ? 'border-blue-500 bg-blue-50'
                          : isSelected
                          ? 'border-blue-300 bg-blue-50/50'
                          : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="h-full flex flex-col">
                        <span className={`text-sm font-bold ${isToday(day) ? 'text-blue-600' : 'text-gray-700'}`}>
                          {day}
                        </span>
                        {dayEvents.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-auto">
                            {dayEvents.slice(0, 3).map(event => (
                              <div key={event.id} className={`w-2 h-2 rounded-full ${getStatusColor(event.status, event.type)}`} />
                            ))}
                            {dayEvents.length > 3 && (
                              <span className="text-[10px] text-gray-500 font-bold">+{dayEvents.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600">Pendiente</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                  <span className="text-gray-600">Cita</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-600">Completada</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-gray-600">No Show</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span className="text-gray-600">Cancelada</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden sticky top-8">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarIcon size={20} className="text-white" />
                  <h3 className="text-base font-bold text-white">
                    {selectedDate
                      ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
                      : 'Selecciona un dia'}
                  </h3>
                </div>
                {selectedDate && (
                  <button
                    onClick={() => setShowNewAppointment(true)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    title="Crear cita"
                  >
                    <Plus size={18} className="text-white" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 max-h-[500px] overflow-y-auto">
              {showNewAppointment && selectedDate && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-sm text-blue-900">Nueva Cita</h4>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Lead</label>
                    <select
                      value={appointmentForm.lead_id}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, lead_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar lead...</option>
                      {leads.map(l => (
                        <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Titulo</label>
                    <input
                      type="text"
                      value={appointmentForm.title}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="Llamada de cierre..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Hora</label>
                    <input
                      type="time"
                      value={appointmentForm.start_time}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Notas</label>
                    <textarea
                      value={appointmentForm.description}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowNewAppointment(false)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button onClick={createAppointment} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
                      Crear
                    </button>
                  </div>
                </div>
              )}

              {editingAppointment && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-sm text-amber-900">Editar Cita</h4>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Titulo</label>
                    <input
                      type="text"
                      value={appointmentForm.title}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Hora</label>
                    <input
                      type="time"
                      value={appointmentForm.start_time}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Notas</label>
                    <textarea
                      value={appointmentForm.description}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingAppointment(null); setAppointmentForm({ lead_id: '', title: '', start_time: '', description: '' }); }} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button onClick={updateAppointment} className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700">
                      Guardar
                    </button>
                  </div>
                </div>
              )}

              {!selectedDate ? (
                <div className="text-center py-8 text-gray-400">
                  <CalendarIcon size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Haz clic en un dia para ver los eventos</p>
                </div>
              ) : selectedDateEvents.length === 0 && !showNewAppointment ? (
                <div className="text-center py-8 text-gray-400">
                  <Phone size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Sin eventos para este dia</p>
                  <button
                    onClick={() => setShowNewAppointment(true)}
                    className="mt-3 text-sm font-bold text-blue-600 hover:text-blue-700"
                  >
                    + Crear cita
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map(event => (
                    <div
                      key={event.id}
                      className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                        event.type === 'appointment'
                          ? 'border-teal-200 bg-teal-50/50 hover:border-teal-300'
                          : event.type === 'scheduled_call'
                          ? 'border-blue-200 bg-blue-50/50 hover:border-blue-300'
                          : 'border-orange-200 bg-orange-50/50 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {event.type === 'appointment' ? (
                            <CalendarIcon size={16} className="text-teal-600" />
                          ) : event.type === 'scheduled_call' ? (
                            <Phone size={16} className="text-blue-600" />
                          ) : (
                            <User size={16} className="text-orange-600" />
                          )}
                          <span className="font-bold text-gray-900 text-sm">{event.title}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {event.type === 'appointment' && event.appointment && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingAppointment(event.appointment!);
                                  setAppointmentForm({
                                    lead_id: event.appointment!.lead_id,
                                    title: event.appointment!.title,
                                    start_time: event.appointment!.start_time?.slice(0, 5) || '',
                                    description: event.appointment!.description || '',
                                  });
                                }}
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                onClick={() => deleteAppointment(event.appointment!.id)}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {getTypeLabel(event.type)}
                          {event.time && ` - ${event.time.slice(0, 5)}`}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          event.status === 'si' || event.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : event.status === 'no_show'
                            ? 'bg-red-100 text-red-700'
                            : event.status === 'cancelada' || event.status === 'skipped' || event.status === 'cancelled'
                            ? 'bg-gray-100 text-gray-700'
                            : event.type === 'appointment'
                            ? 'bg-teal-100 text-teal-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {getStatusLabel(event)}
                        </span>
                      </div>

                      {event.type === 'appointment' && event.appointment?.status === 'scheduled' && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                          <button
                            onClick={() => updateAppointmentStatus(event.appointment!.id, 'completed')}
                            className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200"
                          >
                            <CheckCircle size={12} />
                            Completar
                          </button>
                          <button
                            onClick={() => updateAppointmentStatus(event.appointment!.id, 'cancelled')}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200"
                          >
                            <XCircle size={12} />
                            Cancelar
                          </button>
                        </div>
                      )}

                      {(getContactPhone(event) || getContactEmail(event)) && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                          {getContactPhone(event) && (
                            <button
                              onClick={() => openWhatsApp(getContactPhone(event)!)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors"
                            >
                              <MessageCircle size={12} />
                              WhatsApp
                            </button>
                          )}
                          {getContactEmail(event) && (
                            <button
                              onClick={() => openEmail(getContactEmail(event)!, event.title)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors"
                            >
                              <Mail size={12} />
                              Email
                            </button>
                          )}
                        </div>
                      )}

                      {event.lead && (
                        <button
                          onClick={() => setContactDetailLead(event.lead!)}
                          className="mt-2 w-full text-xs font-bold text-center text-gray-500 hover:text-blue-600 py-1 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          Ver ficha completa
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ContactDetail
        lead={contactDetailLead}
        isOpen={!!contactDetailLead}
        onClose={() => setContactDetailLead(null)}
      />
    </>
  );
}
