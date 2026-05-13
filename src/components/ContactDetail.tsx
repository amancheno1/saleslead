import { useState, useEffect } from 'react';
import { X, MessageCircle, Mail, Phone, Send, User, Calendar, DollarSign, CheckCircle, XCircle, Clock, Plus, Trash2, Tag, CreditCard as Edit3, Save, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadNote = Database['public']['Tables']['lead_notes']['Row'];
type ProjectTag = Database['public']['Tables']['project_tags']['Row'];
type Appointment = Database['public']['Tables']['appointments']['Row'];

interface ContactDetailProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

const PIPELINE_STAGES = [
  { id: 'nuevo', label: 'Nuevo', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'contactado', label: 'Contactado', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { id: 'agendado', label: 'Agendado', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'seguimiento', label: 'Seguimiento', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { id: 'cerrado', label: 'Cerrado', color: 'bg-green-100 text-green-700 border-green-200' },
];

export default function ContactDetail({ lead, isOpen, onClose }: ContactDetailProps) {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'whatsapp' | 'email' | 'appointments'>('info');
  const [tags, setTags] = useState<ProjectTag[]>([]);
  const [leadTags, setLeadTags] = useState<string[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({ title: '', date: '', start_time: '', description: '' });
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ phone: '', email: '', observations: '', closer: '' });
  const [currentStage, setCurrentStage] = useState('nuevo');
  const [showStageDropdown, setShowStageDropdown] = useState(false);

  useEffect(() => {
    if (lead && isOpen) {
      fetchNotes();
      fetchTags();
      fetchAppointments();
      setActiveTab('info');
      setWhatsappMessage('');
      setEmailSubject(`Seguimiento - ${lead.first_name} ${lead.last_name}`);
      setEmailBody('');
      setCurrentStage(lead.pipeline_status || 'nuevo');
      setEditForm({
        phone: lead.phone || '',
        email: lead.email || '',
        observations: lead.observations || '',
        closer: lead.closer || '',
      });
      setEditing(false);
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

  const fetchTags = async () => {
    if (!lead || !currentProject) return;
    const [tagsRes, leadTagsRes] = await Promise.all([
      supabase.from('project_tags').select('*').eq('project_id', currentProject.id),
      supabase.from('lead_tags').select('tag_id').eq('lead_id', lead.id),
    ]);
    setTags(tagsRes.data || []);
    setLeadTags((leadTagsRes.data || []).map((lt: any) => lt.tag_id));
  };

  const fetchAppointments = async () => {
    if (!lead || !currentProject) return;
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('lead_id', lead.id)
      .eq('project_id', currentProject.id)
      .order('date', { ascending: true });
    setAppointments(data || []);
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

  const toggleTag = async (tagId: string) => {
    if (!lead || !currentProject) return;
    const hasTag = leadTags.includes(tagId);
    if (hasTag) {
      await supabase.from('lead_tags').delete().eq('lead_id', lead.id).eq('tag_id', tagId);
      setLeadTags(prev => prev.filter(id => id !== tagId));
    } else {
      await supabase.from('lead_tags').insert({ lead_id: lead.id, tag_id: tagId, project_id: currentProject.id });
      setLeadTags(prev => [...prev, tagId]);
    }
  };

  const changeStage = async (newStage: string) => {
    if (!lead) return;
    const { error } = await supabase.from('leads').update({ pipeline_status: newStage }).eq('id', lead.id);
    if (!error) {
      setCurrentStage(newStage);
      setShowStageDropdown(false);
    }
  };

  const saveEdits = async () => {
    if (!lead) return;
    const { error } = await supabase.from('leads').update({
      phone: editForm.phone || null,
      email: editForm.email || null,
      observations: editForm.observations || null,
      closer: editForm.closer || null,
    }).eq('id', lead.id);
    if (!error) setEditing(false);
  };

  const createAppointment = async () => {
    if (!lead || !currentProject || !user || !appointmentForm.title || !appointmentForm.date || !appointmentForm.start_time) return;
    const { error } = await supabase.from('appointments').insert({
      project_id: currentProject.id,
      lead_id: lead.id,
      user_id: user.id,
      title: appointmentForm.title,
      date: appointmentForm.date,
      start_time: appointmentForm.start_time,
      description: appointmentForm.description || null,
    });
    if (!error) {
      setShowAppointmentForm(false);
      setAppointmentForm({ title: '', date: '', start_time: '', description: '' });
      fetchAppointments();
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (!error) fetchAppointments();
  };

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (!error) fetchAppointments();
  };

  const sendWhatsApp = () => {
    const phone = editing ? editForm.phone : lead?.phone;
    if (!phone) return;
    const cleaned = phone.replace(/[^0-9+]/g, '');
    const encoded = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/${cleaned}${whatsappMessage ? `?text=${encoded}` : ''}`, '_blank');
  };

  const sendEmail = () => {
    const email = editing ? editForm.email : lead?.email;
    if (!email) return;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(gmailUrl, '_blank');
  };

  const callPhone = () => {
    const phone = editing ? editForm.phone : lead?.phone;
    if (!phone) return;
    window.open(`tel:${phone}`, '_self');
  };

  if (!isOpen || !lead) return null;

  const stageInfo = PIPELINE_STAGES.find(s => s.id === currentStage) || PIPELINE_STAGES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <User className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{lead.first_name} {lead.last_name}</h2>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {/* Pipeline Stage Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowStageDropdown(!showStageDropdown)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${stageInfo.color} transition-colors`}
                    >
                      {stageInfo.label}
                      <ChevronDown size={12} />
                    </button>
                    {showStageDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-10 min-w-[160px]">
                        {PIPELINE_STAGES.map(stage => (
                          <button
                            key={stage.id}
                            onClick={() => changeStage(stage.id)}
                            className={`w-full text-left px-3 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors ${
                              currentStage === stage.id ? 'text-blue-600' : 'text-gray-700'
                            }`}
                          >
                            {stage.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {lead.closer && <span className="text-gray-400 text-sm font-medium">Closer: {lead.closer}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(!editing)}
                className={`p-2 rounded-lg transition-colors ${editing ? 'bg-blue-500 text-white' : 'hover:bg-white/10 text-white/70'}`}
              >
                <Edit3 size={18} />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="text-white" size={24} />
              </button>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              <Tag size={14} className="text-gray-400" />
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-all ${
                    leadTags.includes(tag.id) ? 'text-white shadow-sm' : 'text-white/50 border border-white/20'
                  }`}
                  style={{ backgroundColor: leadTags.includes(tag.id) ? tag.color : 'transparent' }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-3">
            {(lead.phone || editForm.phone) && (
              <>
                <button
                  onClick={sendWhatsApp}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </button>
                <button
                  onClick={callPhone}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <Phone size={14} />
                  Llamar
                </button>
              </>
            )}
            {(lead.email || editForm.email) && (
              <button
                onClick={sendEmail}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <Mail size={14} />
                Email
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6 shrink-0">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {([
              { key: 'info', label: 'Informacion' },
              { key: 'notes', label: 'Notas' },
              { key: 'appointments', label: 'Citas' },
              { key: 'whatsapp', label: 'WhatsApp' },
              { key: 'email', label: 'Email' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.key === 'appointments' && appointments.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{appointments.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {editing && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                  <p className="text-sm text-blue-700 font-semibold">Modo edicion activo</p>
                  <button onClick={saveEdits} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
                    <Save size={14} />
                    Guardar
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">Datos de Contacto</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    {editing ? (
                      <>
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Telefono</label>
                          <input
                            type="text"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="+34..."
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Email</label>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="email@ejemplo.com"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Closer</label>
                          <input
                            type="text"
                            value={editForm.closer}
                            onChange={(e) => setEditForm({ ...editForm, closer: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
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

              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">Observaciones</h3>
                {editing ? (
                  <textarea
                    value={editForm.observations}
                    onChange={(e) => setEditForm({ ...editForm, observations: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Observaciones sobre el lead..."
                  />
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700">{lead.observations || 'Sin observaciones'}</p>
                  </div>
                )}
              </div>
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

          {activeTab === 'appointments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Citas agendadas</h3>
                <button
                  onClick={() => setShowAppointmentForm(!showAppointmentForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                >
                  <Plus size={16} />
                  Nueva Cita
                </button>
              </div>

              {showAppointmentForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                      <label className="text-xs font-bold text-gray-600 mb-1 block">Fecha</label>
                      <input
                        type="date"
                        value={appointmentForm.date}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Notas (opcional)</label>
                    <textarea
                      value={appointmentForm.description}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Notas de la cita..."
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowAppointmentForm(false)} className="px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg">
                      Cancelar
                    </button>
                    <button onClick={createAppointment} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
                      Crear Cita
                    </button>
                  </div>
                </div>
              )}

              {appointments.length === 0 && !showAppointmentForm ? (
                <div className="text-center py-12 text-gray-400">
                  <Calendar size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Sin citas programadas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {appointments.map(apt => (
                    <div key={apt.id} className={`border rounded-xl p-4 transition-colors ${
                      apt.status === 'completed' ? 'bg-green-50 border-green-200' :
                      apt.status === 'cancelled' ? 'bg-gray-50 border-gray-200 opacity-60' :
                      'bg-white border-gray-200 hover:border-blue-200'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{apt.title}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(apt.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {apt.start_time && ` a las ${apt.start_time.slice(0, 5)}`}
                          </p>
                          {apt.description && <p className="text-xs text-gray-600 mt-1">{apt.description}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          {apt.status === 'scheduled' && (
                            <>
                              <button
                                onClick={() => updateAppointmentStatus(apt.id, 'completed')}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                title="Completar"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                                className="p-1.5 text-orange-500 hover:bg-orange-100 rounded-lg transition-colors"
                                title="Cancelar"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteAppointment(apt.id)}
                            className="p-1.5 text-red-400 hover:bg-red-100 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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
                  </div>

                  <button
                    onClick={sendWhatsApp}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold shadow-lg transition-colors"
                  >
                    <Send size={18} />
                    Abrir WhatsApp
                  </button>

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
