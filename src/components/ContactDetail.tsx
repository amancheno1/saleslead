import { useState, useEffect } from 'react';
import { X, MessageCircle, Mail, Phone, Send, User, Calendar, DollarSign, CheckCircle, XCircle, Clock, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadNote = Database['public']['Tables']['lead_notes']['Row'];

interface ContactDetailProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactDetail({ lead, isOpen, onClose }: ContactDetailProps) {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'whatsapp' | 'email'>('info');

  useEffect(() => {
    if (lead && isOpen) {
      fetchNotes();
      setActiveTab('info');
      setWhatsappMessage('');
      setEmailSubject(`Seguimiento - ${lead.first_name} ${lead.last_name}`);
      setEmailBody('');
    }
  }, [lead, isOpen]);

  const fetchNotes = async () => {
    if (!lead || !currentProject) return;
    const { data } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', lead.id)
      .eq('project_id', currentProject.id)
      .order('created_at', { ascending: false });
    setNotes(data || []);
  };

  const addNote = async () => {
    if (!newNote.trim() || !lead || !currentProject || !user) return;
    setSavingNote(true);
    const { error } = await supabase.from('lead_notes').insert([{
      lead_id: lead.id,
      project_id: currentProject.id,
      user_id: user.id,
      content: newNote.trim(),
    }] as any);
    if (!error) {
      setNewNote('');
      fetchNotes();
    }
    setSavingNote(false);
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase.from('lead_notes').delete().eq('id', noteId);
    if (!error) fetchNotes();
  };

  const sendWhatsApp = () => {
    if (!lead?.phone) return;
    const cleaned = lead.phone.replace(/[^0-9+]/g, '');
    const encoded = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/${cleaned}${whatsappMessage ? `?text=${encoded}` : ''}`, '_blank');
  };

  const sendEmail = () => {
    if (!lead?.email) return;
    const params = new URLSearchParams();
    if (emailSubject) params.set('subject', emailSubject);
    if (emailBody) params.set('body', emailBody);
    window.open(`mailto:${lead.email}?${params.toString()}`, '_blank');
  };

  const callPhone = () => {
    if (!lead?.phone) return;
    window.open(`tel:${lead.phone}`, '_self');
  };

  if (!isOpen || !lead) return null;

  const getStatusLabel = () => {
    if (lead.sale_made) return { text: 'Venta Cerrada', color: 'bg-green-100 text-green-700', icon: CheckCircle };
    if (lead.attended_meeting === 'si') return { text: 'Asistio', color: 'bg-blue-100 text-blue-700', icon: CheckCircle };
    if (lead.attended_meeting === 'cancelada') return { text: 'Cancelada', color: 'bg-red-100 text-red-700', icon: XCircle };
    if (lead.attended_meeting === 'no_show') return { text: 'No Show', color: 'bg-orange-100 text-orange-700', icon: Clock };
    if (lead.scheduled_call_date) return { text: 'Agendado', color: 'bg-yellow-100 text-yellow-700', icon: Calendar };
    return { text: 'Pendiente', color: 'bg-gray-100 text-gray-600', icon: Clock };
  };

  const status = getStatusLabel();
  const StatusIcon = status.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <User className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{lead.first_name} {lead.last_name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${status.color}`}>
                    <StatusIcon size={12} />
                    {status.text}
                  </span>
                  {lead.closer && <span className="text-blue-200 text-sm font-medium">Closer: {lead.closer}</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="text-white" size={24} />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-4">
            {lead.phone && (
              <>
                <button
                  onClick={sendWhatsApp}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors shadow-lg"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </button>
                <button
                  onClick={callPhone}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-sm font-bold transition-colors shadow-lg"
                >
                  <Phone size={16} />
                  Llamar
                </button>
              </>
            )}
            {lead.email && (
              <button
                onClick={sendEmail}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors shadow-lg"
              >
                <Mail size={16} />
                Email
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6 shrink-0">
          <div className="flex gap-1 -mb-px">
            {([
              { key: 'info', label: 'Informacion' },
              { key: 'notes', label: 'Notas' },
              { key: 'whatsapp', label: 'WhatsApp' },
              { key: 'email', label: 'Email' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">Datos de Contacto</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-800 font-medium">{lead.phone || 'Sin telefono'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-800 font-medium">{lead.email || 'Sin email'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <User size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-800 font-medium">Formulario: {lead.form_type}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">Fechas</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Ingreso</span>
                      <span className="text-sm font-semibold text-gray-800">{new Date(lead.entry_date).toLocaleDateString('es-ES')}</span>
                    </div>
                    {lead.contact_date && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Contacto</span>
                        <span className="text-sm font-semibold text-gray-800">{new Date(lead.contact_date).toLocaleDateString('es-ES')}</span>
                      </div>
                    )}
                    {lead.scheduled_call_date && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Llamada Agendada</span>
                        <span className="text-sm font-semibold text-gray-800">{new Date(lead.scheduled_call_date).toLocaleDateString('es-ES')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {lead.sale_made && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">Venta</h3>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold">Facturado</p>
                        <p className="text-2xl font-black text-green-600">{'\u20AC'}{(lead.sale_amount || 0).toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold">Cash Collected</p>
                        <p className="text-2xl font-black text-green-700">{'\u20AC'}{(lead.cash_collected || 0).toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold">Metodo</p>
                        <p className="text-sm font-bold text-gray-800">{lead.payment_method || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {lead.observations && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">Observaciones</h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700">{lead.observations}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Escribe una nota sobre este contacto..."
                  rows={3}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <button
                  onClick={addNote}
                  disabled={!newNote.trim() || savingNote}
                  className="self-end px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>

              {notes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Clock size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No hay notas para este contacto</p>
                  <p className="text-sm mt-1">Agrega la primera nota arriba</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map(note => (
                    <div key={note.id} className="group bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-200 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                          <p className="text-xs text-gray-400 mt-2 font-medium">
                            {new Date(note.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              {!lead.phone ? (
                <div className="text-center py-12 text-gray-400">
                  <MessageCircle size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="font-bold text-gray-600">Sin numero de telefono</p>
                  <p className="text-sm mt-1">Este contacto no tiene un telefono registrado</p>
                </div>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-1">
                      <MessageCircle size={20} className="text-green-600" />
                      <p className="font-bold text-green-900">Enviar WhatsApp a {lead.first_name}</p>
                    </div>
                    <p className="text-sm text-green-700 ml-8">{lead.phone}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Mensaje (opcional)</label>
                    <textarea
                      value={whatsappMessage}
                      onChange={(e) => setWhatsappMessage(e.target.value)}
                      placeholder={`Hola ${lead.first_name}, ...`}
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">El mensaje se abrira en WhatsApp Web o la app para que puedas enviarlo</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={sendWhatsApp}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold shadow-lg transition-colors"
                    >
                      <Send size={18} />
                      Abrir WhatsApp
                    </button>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Plantillas rapidas</p>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        `Hola ${lead.first_name}, te escribo para hacer seguimiento de nuestra conversacion. Como estas?`,
                        `Hola ${lead.first_name}, queria recordarte que tenemos nuestra llamada agendada. Te espero!`,
                        `Hola ${lead.first_name}, espero que estes bien. Queria saber si pudiste revisar la propuesta que te envie.`,
                      ].map((template, i) => (
                        <button
                          key={i}
                          onClick={() => setWhatsappMessage(template)}
                          className="text-left p-3 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-lg text-sm text-gray-700 transition-colors"
                        >
                          {template}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-6">
              {!lead.email ? (
                <div className="text-center py-12 text-gray-400">
                  <Mail size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="font-bold text-gray-600">Sin email registrado</p>
                  <p className="text-sm mt-1">Este contacto no tiene un email registrado</p>
                </div>
              ) : (
                <>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-1">
                      <Mail size={20} className="text-orange-600" />
                      <p className="font-bold text-orange-900">Enviar Email a {lead.first_name}</p>
                    </div>
                    <p className="text-sm text-orange-700 ml-8">{lead.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Asunto</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Mensaje</label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder={`Hola ${lead.first_name},\n\n`}
                      rows={8}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">Se abrira Gmail o tu cliente de correo para enviar el email</p>
                  </div>

                  <button
                    onClick={sendEmail}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-bold shadow-lg transition-colors"
                  >
                    <Send size={18} />
                    Abrir Email
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
