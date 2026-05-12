import { useState, useEffect } from 'react';
import { Zap, Plus, Play, Pause, Trash2, CreditCard as Edit2, MessageCircle, Phone, Mail, Clock, ArrowDown, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import type { Database } from '../lib/database.types';

type Automation = Database['public']['Tables']['automations']['Row'];

interface AutomationStep {
  id: string;
  type: 'wait' | 'message' | 'condition';
  delay_hours?: number;
  channel?: string;
  message?: string;
  condition?: string;
}

const TRIGGER_TYPES = [
  { value: 'new_lead', label: 'Nuevo Lead', description: 'Se activa cuando entra un nuevo lead', icon: Plus },
  { value: 'no_show', label: 'No Show', description: 'Se activa cuando un lead no asiste a la llamada', icon: XCircle },
  { value: 'no_answer', label: 'Sin Respuesta', description: 'Se activa cuando un lead no contesta', icon: Phone },
  { value: 'post_sale', label: 'Post Venta', description: 'Se activa despues de cerrar una venta', icon: CheckCircle },
];

const CHANNELS = [
  { value: 'manychat', label: 'ManyChat', icon: MessageCircle, color: 'text-blue-600 bg-blue-100' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600 bg-green-100' },
  { value: 'email', label: 'Email', icon: Mail, color: 'text-orange-600 bg-orange-100' },
];

export default function Automations() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'new_lead',
    channel: 'manychat',
    steps: [] as AutomationStep[],
  });

  useEffect(() => {
    if (currentProject) {
      fetchAutomations();
    }
  }, [currentProject]);

  const fetchAutomations = async () => {
    if (!currentProject) return;

    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAutomations(data || []);
    } catch (error) {
      console.error('Error fetching automations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !user) return;

    try {
      if (editingId) {
        const { error } = await supabase
          .from('automations')
          .update({
            name: formData.name,
            description: formData.description,
            trigger_type: formData.trigger_type,
            channel: formData.channel,
            steps: formData.steps as unknown as any,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('automations').insert([{
          project_id: currentProject.id,
          user_id: user.id,
          name: formData.name,
          description: formData.description,
          trigger_type: formData.trigger_type,
          channel: formData.channel,
          steps: formData.steps as unknown as any,
        }] as any);

        if (error) throw error;
      }

      resetForm();
      fetchAutomations();
    } catch (error) {
      console.error('Error saving automation:', error);
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('automations')
        .update({ is_active: !currentState } as any)
        .eq('id', id);

      if (error) throw error;
      fetchAutomations();
    } catch (error) {
      console.error('Error toggling automation:', error);
    }
  };

  const deleteAutomation = async (id: string) => {
    if (!confirm('Eliminar esta automatizacion?')) return;

    try {
      const { error } = await supabase.from('automations').delete().eq('id', id);
      if (error) throw error;
      fetchAutomations();
    } catch (error) {
      console.error('Error deleting automation:', error);
    }
  };

  const editAutomation = (automation: Automation) => {
    setFormData({
      name: automation.name,
      description: automation.description || '',
      trigger_type: automation.trigger_type,
      channel: automation.channel,
      steps: (automation.steps as unknown as AutomationStep[]) || [],
    });
    setEditingId(automation.id);
    setShowBuilder(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', trigger_type: 'new_lead', channel: 'manychat', steps: [] });
    setEditingId(null);
    setShowBuilder(false);
  };

  const addStep = (type: 'wait' | 'message' | 'condition') => {
    const newStep: AutomationStep = {
      id: crypto.randomUUID(),
      type,
      ...(type === 'wait' ? { delay_hours: 24 } : {}),
      ...(type === 'message' ? { channel: formData.channel, message: '' } : {}),
      ...(type === 'condition' ? { condition: 'no_response' } : {}),
    };
    setFormData({ ...formData, steps: [...formData.steps, newStep] });
  };

  const updateStep = (id: string, updates: Partial<AutomationStep>) => {
    setFormData({
      ...formData,
      steps: formData.steps.map(s => s.id === id ? { ...s, ...updates } : s)
    });
  };

  const removeStep = (id: string) => {
    setFormData({ ...formData, steps: formData.steps.filter(s => s.id !== id) });
  };

  const getTriggerInfo = (type: string) => TRIGGER_TYPES.find(t => t.value === type);
  const getChannelInfo = (channel: string) => CHANNELS.find(c => c.value === channel);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDMiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-yellow-500/20 rounded-xl">
                  <Zap className="text-yellow-400" size={28} />
                </div>
                <h2 className="text-2xl font-black text-white">Automatizaciones</h2>
              </div>
              <p className="text-gray-400 text-sm max-w-lg">
                Crea flujos automatizados con ManyChat para seguimientos automaticos.
                Configura triggers, mensajes y delays para no perder ningun lead.
              </p>
            </div>
            {!showBuilder && (
              <button
                onClick={() => setShowBuilder(true)}
                className="flex items-center gap-2 px-5 py-3 bg-yellow-500 text-gray-900 rounded-xl hover:bg-yellow-400 transition-colors font-black shadow-lg"
              >
                <Plus size={18} />
                Nuevo Flujo
              </button>
            )}
          </div>
        </div>
      </div>

      {showBuilder && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-5">
            <h3 className="text-lg font-bold text-white">
              {editingId ? 'Editar Flujo' : 'Crear Nuevo Flujo de Automatizacion'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Flujo</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Seguimiento No Show"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Descripcion</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripcion breve del flujo..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Trigger (Activador)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {TRIGGER_TYPES.map(trigger => {
                  const Icon = trigger.icon;
                  return (
                    <button
                      key={trigger.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, trigger_type: trigger.value })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.trigger_type === trigger.value
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={20} className={formData.trigger_type === trigger.value ? 'text-blue-600' : 'text-gray-400'} />
                      <p className="text-sm font-bold text-gray-900 mt-2">{trigger.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{trigger.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Canal</label>
              <div className="flex gap-3">
                {CHANNELS.map(ch => {
                  const Icon = ch.icon;
                  return (
                    <button
                      key={ch.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, channel: ch.value })}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${
                        formData.channel === ch.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={16} />
                      {ch.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-bold text-gray-700">Pasos del Flujo</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addStep('wait')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Clock size={12} /> Espera
                  </button>
                  <button
                    type="button"
                    onClick={() => addStep('message')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <MessageCircle size={12} /> Mensaje
                  </button>
                  <button
                    type="button"
                    onClick={() => addStep('condition')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                  >
                    <AlertTriangle size={12} /> Condicion
                  </button>
                </div>
              </div>

              {formData.steps.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                  <Zap size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Agrega pasos al flujo</p>
                  <p className="text-xs mt-1">Usa los botones de arriba para construir tu automatizacion</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 border-2 border-green-200 rounded-xl">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <Play size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green-800">INICIO</p>
                      <p className="text-xs text-green-600">{getTriggerInfo(formData.trigger_type)?.label}</p>
                    </div>
                  </div>

                  {formData.steps.map((step) => (
                    <div key={step.id}>
                      <div className="flex justify-center py-1">
                        <ArrowDown size={16} className="text-gray-300" />
                      </div>
                      <div className={`p-4 border-2 rounded-xl relative group ${
                        step.type === 'wait' ? 'border-gray-200 bg-gray-50' :
                        step.type === 'message' ? 'border-blue-200 bg-blue-50' :
                        'border-orange-200 bg-orange-50'
                      }`}>
                        <button
                          type="button"
                          onClick={() => removeStep(step.id)}
                          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>

                        {step.type === 'wait' && (
                          <div className="flex items-center gap-3">
                            <Clock size={18} className="text-gray-600" />
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-700">Esperar</span>
                              <input
                                type="number"
                                min="1"
                                value={step.delay_hours || 24}
                                onChange={(e) => updateStep(step.id, { delay_hours: parseInt(e.target.value) || 1 })}
                                className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm text-center"
                              />
                              <span className="text-sm text-gray-600">horas</span>
                            </div>
                          </div>
                        )}

                        {step.type === 'message' && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <MessageCircle size={18} className="text-blue-600" />
                              <span className="text-sm font-bold text-blue-800">Enviar Mensaje via {getChannelInfo(formData.channel)?.label}</span>
                            </div>
                            <textarea
                              value={step.message || ''}
                              onChange={(e) => updateStep(step.id, { message: e.target.value })}
                              placeholder="Escribe el mensaje automatico..."
                              rows={2}
                              className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}

                        {step.type === 'condition' && (
                          <div className="flex items-center gap-3">
                            <AlertTriangle size={18} className="text-orange-600" />
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-orange-800">Si</span>
                              <select
                                value={step.condition || 'no_response'}
                                onChange={(e) => updateStep(step.id, { condition: e.target.value })}
                                className="px-3 py-1.5 border border-orange-200 rounded-lg text-sm"
                              >
                                <option value="no_response">No responde</option>
                                <option value="responded">Responde</option>
                                <option value="clicked_link">Hace clic en enlace</option>
                                <option value="opened_message">Abre mensaje</option>
                              </select>
                              <span className="text-sm text-orange-700">entonces continuar</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-bold text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm shadow-lg"
              >
                {editingId ? 'Actualizar Flujo' : 'Crear Flujo'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {automations.length === 0 && !showBuilder ? (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Zap size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No hay flujos de automatizacion</p>
            <p className="text-sm text-gray-400 mt-1">Crea tu primer flujo para automatizar seguimientos</p>
          </div>
        ) : (
          automations.map(automation => {
            const trigger = getTriggerInfo(automation.trigger_type);
            const channel = getChannelInfo(automation.channel);
            const steps = (automation.steps as unknown as AutomationStep[]) || [];
            const TriggerIcon = trigger?.icon || Zap;

            return (
              <div
                key={automation.id}
                className={`bg-white rounded-2xl border-2 p-5 transition-all hover:shadow-lg ${
                  automation.is_active ? 'border-green-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${automation.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <TriggerIcon size={20} className={automation.is_active ? 'text-green-600' : 'text-gray-500'} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{automation.name}</h4>
                      {automation.description && (
                        <p className="text-xs text-gray-500">{automation.description}</p>
                      )}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                    automation.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {automation.is_active ? 'Activo' : 'Inactivo'}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
                  <span className="px-2 py-0.5 bg-gray-100 rounded font-medium">{trigger?.label}</span>
                  <span>via</span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded font-medium">{channel?.label}</span>
                  <span>-</span>
                  <span>{steps.length} pasos</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(automation.id, automation.is_active)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      automation.is_active
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {automation.is_active ? <Pause size={12} /> : <Play size={12} />}
                    {automation.is_active ? 'Pausar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => editAutomation(automation)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
                  >
                    <Edit2 size={12} /> Editar
                  </button>
                  <button
                    onClick={() => deleteAutomation(automation.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={12} /> Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
