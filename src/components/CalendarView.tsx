import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Phone, Clock, CheckCircle, XCircle, User, Calendar as CalendarIcon, MessageCircle, Mail, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProject } from '../context/ProjectContext';
import ContactDetail from './ContactDetail';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];
type FollowUp = Database['public']['Tables']['follow_ups']['Row'];

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: 'scheduled_call' | 'follow_up';
  status?: string;
  lead?: Lead;
  followUp?: FollowUp & { leads?: { first_name: string; last_name: string; phone?: string; email?: string } };
}

export default function CalendarView() {
  const { currentProject } = useProject();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [contactDetailLead, setContactDetailLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentProject) {
      fetchEvents();
    }
  }, [currentProject, currentDate]);

  const fetchEvents = async () => {
    if (!currentProject) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

    try {
      const [leadsRes, followUpsRes] = await Promise.all([
        supabase
          .from('leads')
          .select('*')
          .eq('project_id', currentProject.id)
          .not('scheduled_call_date', 'is', null)
          .gte('scheduled_call_date', firstDay)
          .lte('scheduled_call_date', lastDay) as any,
        supabase
          .from('follow_ups')
          .select('*, leads(first_name, last_name, phone, email)')
          .eq('project_id', currentProject.id)
          .gte('scheduled_date', firstDay)
          .lte('scheduled_date', lastDay) as any
      ]);

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
              lead
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
            followUp: fu
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

  const getStatusColor = (status: string | undefined) => {
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

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'si':
      case 'completed': return <CheckCircle size={14} className="text-green-600" />;
      case 'no_show': return <XCircle size={14} className="text-red-600" />;
      case 'cancelada':
      case 'skipped': return <Clock size={14} className="text-gray-500" />;
      default: return <Clock size={14} className="text-blue-600" />;
    }
  };

  const getStatusLabel = (event: CalendarEvent) => {
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
    const cleaned = phone.replace(/[^0-9+]/g, '');
    window.open(`https://wa.me/${cleaned}`, '_blank');
  };

  const openEmail = (email: string, name: string) => {
    window.open(`mailto:${email}?subject=Seguimiento - ${name}`, '_blank');
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
                        <span className={`text-sm font-bold ${
                          isToday(day) ? 'text-blue-600' : 'text-gray-700'
                        }`}>
                          {day}
                        </span>
                        {dayEvents.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-auto">
                            {dayEvents.slice(0, 3).map(event => (
                              <div
                                key={event.id}
                                className={`w-2 h-2 rounded-full ${getStatusColor(event.status)}`}
                              />
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
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-600">Asistida/Completada</span>
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

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden sticky top-8">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-5">
              <div className="flex items-center gap-3">
                <CalendarIcon size={20} className="text-white" />
                <h3 className="text-base font-bold text-white">
                  {selectedDate
                    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
                    : 'Selecciona un dia'}
                </h3>
              </div>
            </div>

            <div className="p-4 max-h-[500px] overflow-y-auto">
              {!selectedDate ? (
                <div className="text-center py-8 text-gray-400">
                  <CalendarIcon size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Haz clic en un dia para ver los eventos</p>
                </div>
              ) : selectedDateEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Phone size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Sin eventos para este dia</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer ${
                        event.type === 'scheduled_call'
                          ? 'border-blue-200 bg-blue-50/50 hover:border-blue-300'
                          : 'border-orange-200 bg-orange-50/50 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {event.type === 'scheduled_call' ? (
                            <Phone size={16} className="text-blue-600" />
                          ) : (
                            <User size={16} className="text-orange-600" />
                          )}
                          <span className="font-bold text-gray-900 text-sm">{event.title}</span>
                        </div>
                        {getStatusIcon(event.status)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {event.type === 'scheduled_call' ? 'Llamada' : 'Seguimiento'}
                          {event.time && ` - ${event.time.slice(0, 5)}`}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          event.status === 'si' || event.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : event.status === 'no_show'
                            ? 'bg-red-100 text-red-700'
                            : event.status === 'cancelada' || event.status === 'skipped'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {getStatusLabel(event)}
                        </span>
                      </div>
                      {(getContactPhone(event) || getContactEmail(event)) && (
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200">
                          {getContactPhone(event) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openWhatsApp(getContactPhone(event)!); }}
                              className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors"
                            >
                              <MessageCircle size={12} />
                              WhatsApp
                            </button>
                          )}
                          {getContactEmail(event) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openEmail(getContactEmail(event)!, event.title); }}
                              className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors"
                            >
                              <Mail size={12} />
                              Email
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className={`p-6 ${
              selectedEvent.type === 'scheduled_call'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                : 'bg-gradient-to-r from-orange-500 to-orange-600'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <User size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedEvent.title}</h3>
                    <p className="text-sm text-white/80">
                      {selectedEvent.type === 'scheduled_call' ? 'Llamada Agendada' : 'Seguimiento'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Fecha</p>
                  <p className="text-sm font-bold text-gray-900">
                    {new Date(selectedEvent.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Estado</p>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    selectedEvent.status === 'si' || selectedEvent.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : selectedEvent.status === 'no_show'
                      ? 'bg-red-100 text-red-700'
                      : selectedEvent.status === 'cancelada' || selectedEvent.status === 'skipped'
                      ? 'bg-gray-200 text-gray-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {getStatusLabel(selectedEvent)}
                  </span>
                </div>
              </div>

              {getContactPhone(selectedEvent) && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Telefono</p>
                  <p className="text-sm font-bold text-gray-900">{getContactPhone(selectedEvent)}</p>
                </div>
              )}

              {getContactEmail(selectedEvent) && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Email</p>
                  <p className="text-sm font-bold text-gray-900">{getContactEmail(selectedEvent)}</p>
                </div>
              )}

              {selectedEvent.lead?.observations && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Observaciones</p>
                  <p className="text-sm text-gray-700">{selectedEvent.lead.observations}</p>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Acciones rapidas</p>
                <div className="flex flex-wrap gap-2">
                  {getContactPhone(selectedEvent) && (
                    <>
                      <button
                        onClick={() => openWhatsApp(getContactPhone(selectedEvent)!)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors shadow-lg"
                      >
                        <MessageCircle size={16} />
                        Enviar WhatsApp
                      </button>
                      <a
                        href={`tel:${getContactPhone(selectedEvent)}`}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg"
                      >
                        <Phone size={16} />
                        Llamar
                      </a>
                    </>
                  )}
                  {getContactEmail(selectedEvent) && (
                    <button
                      onClick={() => openEmail(getContactEmail(selectedEvent)!, selectedEvent.title)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors shadow-lg"
                    >
                      <Mail size={16} />
                      Enviar Email
                    </button>
                  )}
                  {!getContactPhone(selectedEvent) && !getContactEmail(selectedEvent) && (
                    <p className="text-sm text-gray-400">No hay datos de contacto registrados para este lead</p>
                  )}
                </div>
              </div>

              {selectedEvent.lead && (
                <div className="border-t border-gray-100 pt-4">
                  <button
                    onClick={() => { setContactDetailLead(selectedEvent.lead!); setSelectedEvent(null); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-sm transition-colors"
                  >
                    <User size={16} />
                    Ver Ficha Completa
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ContactDetail
        lead={contactDetailLead}
        isOpen={!!contactDetailLead}
        onClose={() => setContactDetailLead(null)}
      />
    </>
  );
}
