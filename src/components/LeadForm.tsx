import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Insert'];

interface LeadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  editLead?: Database['public']['Tables']['leads']['Row'];
}

export default function LeadForm({ onSuccess, onCancel, editLead }: LeadFormProps) {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);

  const getDefaultDate = () => {
    const today = new Date();
    const minDate = new Date('2025-01-01');
    const maxDate = new Date('2030-12-31');

    if (today < minDate) return '2025-01-01';
    if (today > maxDate) return '2030-12-31';
    return today.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState<Lead>({
    first_name: editLead?.first_name || '',
    last_name: editLead?.last_name || '',
    form_type: editLead?.form_type || 'guía',
    entry_date: editLead?.entry_date || getDefaultDate(),
    contact_date: editLead?.contact_date || null,
    scheduled_call_date: editLead?.scheduled_call_date || null,
    attended_meeting: editLead?.attended_meeting ?? null,
    result: editLead?.result || null,
    sale_made: editLead?.sale_made || false,
    observations: editLead?.observations || null,
    sale_amount: editLead?.sale_amount || null,
    payment_method: editLead?.payment_method || null,
    cash_collected: editLead?.cash_collected || null,
    closer: editLead?.closer || null,
    installment_count: editLead?.installment_count || null,
    initial_payment: editLead?.initial_payment || null,
    project_id: editLead?.project_id || currentProject?.id || null,
    user_id: editLead?.user_id || user?.id || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editLead) {
        const { error } = await supabase
          .from('leads')
          .update(formData)
          .eq('id', editLead.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('leads')
          .insert([formData]);

        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving lead:', error);
      alert('Error al guardar el lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre
          </label>
          <input
            type="text"
            required
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Apellidos
          </label>
          <input
            type="text"
            required
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Form
          </label>
          <select
            required
            value={formData.form_type}
            onChange={(e) => setFormData({ ...formData, form_type: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="guía">Guía</option>
            <option value="calculadora">Calculadora</option>
            <option value="dashboard">Dashboard</option>
            <option value="nuevo programa">Nuevo Programa</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de Entrada
          </label>
          <input
            type="date"
            required
            min="2025-01-01"
            max="2030-12-31"
            value={formData.entry_date}
            onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de Contacto
          </label>
          <input
            type="date"
            min="2025-01-01"
            max="2030-12-31"
            value={formData.contact_date || ''}
            onChange={(e) => setFormData({ ...formData, contact_date: e.target.value || null })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha Llamada Agendada
          </label>
          <input
            type="date"
            min="2025-01-01"
            max="2030-12-31"
            value={formData.scheduled_call_date || ''}
            onChange={(e) => setFormData({ ...formData, scheduled_call_date: e.target.value || null })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ¿Asistió a Reunión?
          </label>
          <select
            value={formData.attended_meeting || ''}
            onChange={(e) => setFormData({
              ...formData,
              attended_meeting: e.target.value || null
            })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Sin definir</option>
            <option value="si">Sí</option>
            <option value="cancelada">Cancelada</option>
            <option value="no_show">No Show</option>
            <option value="no">No</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resultado
          </label>
          <select
            value={formData.result || ''}
            onChange={(e) => setFormData({ ...formData, result: e.target.value || null })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Sin definir</option>
            <option value="interesado">Interesado</option>
            <option value="no">No</option>
            <option value="seguimiento">Seguimiento</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Venta Realizada
          </label>
          <select
            value={formData.sale_made.toString()}
            onChange={(e) => setFormData({ ...formData, sale_made: e.target.value === 'true' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="false">No</option>
            <option value="true">Sí</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Importe Venta
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.sale_amount || ''}
            onChange={(e) => setFormData({ ...formData, sale_amount: e.target.value ? parseFloat(e.target.value) : null })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Forma de Pago
          </label>
          <select
            value={formData.payment_method || ''}
            onChange={(e) => {
              const newPaymentMethod = e.target.value || null;
              setFormData({
                ...formData,
                payment_method: newPaymentMethod,
                installment_count: newPaymentMethod === 'Pago a plazos' ? formData.installment_count : null,
                initial_payment: newPaymentMethod === 'Pago a plazos' ? formData.initial_payment : null,
              });
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Sin definir</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Pago a plazos">Pago a plazos</option>
            <option value="Sequra">Sequra</option>
          </select>
        </div>

        {formData.payment_method === 'Pago a plazos' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Plazos
              </label>
              <select
                value={formData.installment_count || ''}
                onChange={(e) => setFormData({ ...formData, installment_count: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar</option>
                <option value="2">2 plazos</option>
                <option value="3">3 plazos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Importe Inicial
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.initial_payment || ''}
                onChange={(e) => setFormData({ ...formData, initial_payment: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cash Collected
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.cash_collected || ''}
            onChange={(e) => setFormData({ ...formData, cash_collected: e.target.value ? parseFloat(e.target.value) : null })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Closer
          </label>
          <input
            type="text"
            value={formData.closer || ''}
            onChange={(e) => setFormData({ ...formData, closer: e.target.value || null })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observaciones
          </label>
          <textarea
            value={formData.observations || ''}
            onChange={(e) => setFormData({ ...formData, observations: e.target.value || null })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex gap-4 justify-end pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Guardando...' : editLead ? 'Actualizar' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
