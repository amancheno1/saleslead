import { X, User, Calendar, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];

interface LeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  title: string;
  subtitle?: string;
}

export default function LeadsModal({ isOpen, onClose, leads, title, subtitle }: LeadsModalProps) {
  if (!isOpen) return null;

  const getStatusBadge = (lead: Lead) => {
    if (lead.sale_made) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
          <CheckCircle size={12} />
          Venta
        </span>
      );
    }
    if (lead.attended_meeting === 'si') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
          <CheckCircle size={12} />
          Asistió
        </span>
      );
    }
    if (lead.attended_meeting === 'cancelada') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
          <XCircle size={12} />
          Cancelada
        </span>
      );
    }
    if (lead.attended_meeting === 'no_show') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
          <Clock size={12} />
          No Show
        </span>
      );
    }
    if (lead.scheduled_call_date) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
          <Calendar size={12} />
          Agendado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
        Pendiente
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-slideUp">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 border-b border-blue-800/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white mb-1">{title}</h2>
              {subtitle && <p className="text-sm text-blue-100 font-medium">{subtitle}</p>}
              <p className="text-sm text-blue-200 font-semibold mt-2">Total: {leads.length} leads</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="text-white" size={24} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          {leads.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="text-gray-400" size={32} />
              </div>
              <p className="text-gray-600 font-medium">No hay leads en este periodo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="group relative bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>

                  <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                              <User className="text-white" size={20} />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">
                                {lead.first_name} {lead.last_name}
                              </h3>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                {lead.setter && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-semibold">Setter:</span> {lead.setter}
                                  </p>
                                )}
                                {lead.closer && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-semibold">Closer:</span> {lead.closer}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          {getStatusBadge(lead)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar size={16} className="text-orange-500 shrink-0" />
                            <span>
                              <span className="font-semibold">Ingreso:</span>{' '}
                              {new Date(lead.entry_date).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                          {lead.scheduled_call_date && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar size={16} className="text-purple-500 shrink-0" />
                              <span>
                                <span className="font-semibold">Llamada:</span>{' '}
                                {new Date(lead.scheduled_call_date).toLocaleDateString('es-ES')}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-semibold">Formulario:</span> {lead.form_type}
                          </div>
                          {lead.result && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="font-semibold">Resultado:</span> {lead.result}
                            </div>
                          )}
                        </div>

                        {lead.observations && (
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-gray-500 font-semibold mb-1">Observaciones</p>
                            <p className="text-sm text-gray-700">{lead.observations}</p>
                          </div>
                        )}
                      </div>

                      {lead.sale_made && (
                        <div className="lg:shrink-0 lg:w-64">
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                            <div className="flex items-center gap-2 mb-3">
                              <DollarSign className="text-green-600" size={20} />
                              <p className="text-sm font-bold text-green-900">Información de Venta</p>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs text-gray-600 font-semibold">Facturado</p>
                                <p className="text-2xl font-black text-green-600">
                                  €{(lead.sale_amount || 0).toFixed(0)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 font-semibold">Cash Collected</p>
                                <p className="text-xl font-bold text-green-700">
                                  €{(lead.cash_collected || 0).toFixed(0)}
                                </p>
                              </div>
                              {lead.sale_amount && lead.sale_amount > 0 && (
                                <div className="pt-2 border-t border-green-200">
                                  <p className="text-xs text-gray-600 font-semibold mb-1">% Cobrado</p>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-green-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-green-600 rounded-full transition-all"
                                        style={{
                                          width: `${Math.min(((lead.cash_collected || 0) / lead.sale_amount) * 100, 100)}%`
                                        }}
                                      ></div>
                                    </div>
                                    <span className="text-xs font-bold text-green-700">
                                      {((lead.cash_collected || 0) / lead.sale_amount * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
