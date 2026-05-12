import { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock, Phone, MessageCircle, Mail, X, Search, Filter, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];
type FollowUp = Database['public']['Tables']['follow_ups']['Row'];

interface FollowUpWithLead extends FollowUp {
  leads?: { first_name: string; last_name: string } | null;
}

export default function FollowUps() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [followUps, setFollowUps] = useState<FollowUpWithLead[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    lead_id: '',
    type: 'call',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '',
    notes: ''
  });

  useEffect(() => {
    if (currentProject) {
      fetchData();
    }
  }, [currentProject]);

  const fetchData = async () => {
    if (!currentProject) return;

    try {
      const [followUpsRes, leadsRes] = await Promise.all([
        supabase
          .from('follow_ups')
          .select('*, leads(first_name, last_name)')
          .eq('project_id', currentProject.id)
          .order('scheduled_date', { ascending: true }),
        supabase
          .from('leads')
          .select('*')
          .eq('project_id', currentProject.id)
          .order('first_name', { ascending: true })
      ]);

      if (followUpsRes.error) throw followUpsRes.error;
      if (leadsRes.error) throw leadsRes.error;

      setFollowUps(followUpsRes.data || []);
      setLeads(leadsRes.data || []);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !user) return;

    try {
      const { error } = await supabase.from('follow_ups').insert([{
        project_id: currentProject.id,
        lead_id: formData.lead_id,
        user_id: user.id,
        type: formData.type,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time || null,
        notes: formData.notes || null,
      }]);

      if (error) throw error;

      setShowForm(false);
      setFormData({ lead_id: '', type: 'call', scheduled_date: new Date().toISOString().split('T')[0], scheduled_time: '', notes: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating follow-up:', error);
    }
  };

  const markComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('follow_ups')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error updating follow-up:', error);
    }
  };

  const markSkipped = async (id: string) => {
    try {
      const { error } = await supabase
        .from('follow_ups')
        .update({ status: 'skipped' })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error updating follow-up:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone size={16} className="text-blue-600" />;
      case 'whatsapp': return <MessageCircle size={16} className="text-green-600" />;
      case 'email': return <Mail size={16} className="text-orange-600" />;
      case 'manychat': return <MessageCircle size={16} className="text-blue-500" />;
      default: return <Phone size={16} className="text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'call': return 'Llamada';
      case 'whatsapp': return 'WhatsApp';
      case 'email': return 'Email';
      case 'manychat': return 'ManyChat';
      default: return type;
    }
  };

  const filteredFollowUps = followUps.filter(fu => {
    const matchesFilter = filter === 'all' || fu.status === filter;
    const leadName = fu.leads ? `${fu.leads.first_name} ${fu.leads.last_name}` : '';
    const matchesSearch = !searchTerm || leadName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todayFollowUps = followUps.filter(fu => fu.scheduled_date === todayStr && fu.status === 'pending');
  const overdueFollowUps = followUps.filter(fu => fu.scheduled_date < todayStr && fu.status === 'pending');
  const pendingCount = followUps.filter(fu => fu.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 shadow-lg">
          <p className="text-sm font-bold text-white/80 uppercase tracking-wide">Pendientes</p>
          <p className="text-4xl font-black text-white mt-2">{pendingCount}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-5 shadow-lg">
          <p className="text-sm font-bold text-white/80 uppercase tracking-wide">Atrasados</p>
          <p className="text-4xl font-black text-white mt-2">{overdueFollowUps.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 shadow-lg">
          <p className="text-sm font-bold text-white/80 uppercase tracking-wide">Hoy</p>
          <p className="text-4xl font-black text-white mt-2">{todayFollowUps.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Clock className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Seguimientos</h3>
                <p className="text-sm text-gray-600">Gestiona tus seguimientos a leads</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold shadow-lg"
            >
              <Plus size={18} />
              Nuevo Seguimiento
            </button>
          </div>

          <div className="mt-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              {(['pending', 'completed', 'all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'pending' ? 'Pendientes' : f === 'completed' ? 'Completados' : 'Todos'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showForm && (
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Lead</label>
                  <select
                    required
                    value={formData.lead_id}
                    onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Seleccionar lead...</option>
                    {leads.map(lead => (
                      <option key={lead.id} value={lead.id}>
                        {lead.first_name} {lead.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="call">Llamada</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="manychat">ManyChat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Hora (opcional)</label>
                  <input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Notas (opcional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  placeholder="Notas sobre el seguimiento..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm shadow-lg"
                >
                  Crear Seguimiento
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {filteredFollowUps.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock size={48} className="mx-auto mb-3 opacity-50" />
              <p className="font-medium">No hay seguimientos {filter !== 'all' ? filter === 'pending' ? 'pendientes' : 'completados' : ''}</p>
            </div>
          ) : (
            filteredFollowUps.map(fu => {
              const isOverdue = fu.scheduled_date < todayStr && fu.status === 'pending';
              const isToday = fu.scheduled_date === todayStr;

              return (
                <div
                  key={fu.id}
                  className={`p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${
                    isOverdue ? 'bg-red-50/50' : isToday ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    fu.status === 'completed' ? 'bg-green-100' :
                    fu.status === 'skipped' ? 'bg-gray-100' :
                    isOverdue ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    {getTypeIcon(fu.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 text-sm truncate">
                        {fu.leads ? `${fu.leads.first_name} ${fu.leads.last_name}` : 'Lead'}
                      </p>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 font-medium">
                        {getTypeLabel(fu.type)}
                      </span>
                      {isOverdue && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 rounded-full text-red-700 font-bold">
                          Atrasado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(fu.scheduled_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {fu.scheduled_time && ` a las ${fu.scheduled_time.slice(0, 5)}`}
                      {fu.notes && ` - ${fu.notes}`}
                    </p>
                  </div>

                  {fu.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => markComplete(fu.id)}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        title="Completar"
                      >
                        <CheckCircle size={20} />
                      </button>
                      <button
                        onClick={() => markSkipped(fu.id)}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Omitir"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  )}

                  {fu.status === 'completed' && (
                    <CheckCircle size={20} className="text-green-500" />
                  )}
                  {fu.status === 'skipped' && (
                    <X size={20} className="text-gray-400" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
