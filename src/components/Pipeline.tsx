import { useState, useEffect } from 'react';
import { User, Phone, Mail, MessageCircle, Tag, ChevronRight, ChevronLeft, GripVertical, Plus, X, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProject } from '../context/ProjectContext';
import ContactDetail from './ContactDetail';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];
type ProjectTag = Database['public']['Tables']['project_tags']['Row'];

interface LeadWithTags extends Lead {
  tags?: { tag_id: string; project_tags: ProjectTag }[];
}

const PIPELINE_STAGES = [
  { id: 'nuevo', label: 'Nuevo', color: 'from-blue-500 to-blue-600', bgLight: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  { id: 'contactado', label: 'Contactado', color: 'from-cyan-500 to-teal-600', bgLight: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700' },
  { id: 'agendado', label: 'Agendado', color: 'from-amber-500 to-orange-600', bgLight: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  { id: 'seguimiento', label: 'Seguimiento', color: 'from-rose-500 to-pink-600', bgLight: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
  { id: 'cerrado', label: 'Cerrado', color: 'from-green-500 to-emerald-600', bgLight: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
];

export default function Pipeline() {
  const { currentProject } = useProject();
  const [leads, setLeads] = useState<LeadWithTags[]>([]);
  const [tags, setTags] = useState<ProjectTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactDetailLead, setContactDetailLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [draggedLead, setDraggedLead] = useState<string | null>(null);

  const TAG_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  useEffect(() => {
    if (currentProject) fetchData();
  }, [currentProject]);

  const fetchData = async () => {
    if (!currentProject) return;
    try {
      const [leadsRes, tagsRes, leadTagsRes] = await Promise.all([
        supabase.from('leads').select('*').eq('project_id', currentProject.id),
        supabase.from('project_tags').select('*').eq('project_id', currentProject.id),
        supabase.from('lead_tags').select('*, project_tags(*)').eq('project_id', currentProject.id),
      ]);

      const leadsData = leadsRes.data || [];
      const tagsData = tagsRes.data || [];
      const leadTagsData = (leadTagsRes.data || []) as any[];

      const leadsWithTags: LeadWithTags[] = leadsData.map(lead => ({
        ...lead,
        tags: leadTagsData.filter((lt: any) => lt.lead_id === lead.id),
      }));

      setLeads(leadsWithTags);
      setTags(tagsData);
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const moveLeadToStage = async (leadId: string, newStage: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ pipeline_status: newStage })
        .eq('id', leadId);
      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, pipeline_status: newStage } : l));
    } catch (error) {
      console.error('Error moving lead:', error);
    }
  };

  const addTag = async () => {
    if (!currentProject || !newTagName.trim()) return;
    try {
      const { error } = await supabase.from('project_tags').insert({
        project_id: currentProject.id,
        name: newTagName.trim(),
        color: newTagColor,
      });
      if (error) throw error;
      setNewTagName('');
      fetchData();
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  const deleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase.from('project_tags').delete().eq('id', tagId);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  const toggleLeadTag = async (leadId: string, tagId: string) => {
    if (!currentProject) return;
    const lead = leads.find(l => l.id === leadId);
    const hasTag = lead?.tags?.some(t => t.tag_id === tagId);

    try {
      if (hasTag) {
        await supabase.from('lead_tags').delete().eq('lead_id', leadId).eq('tag_id', tagId);
      } else {
        await supabase.from('lead_tags').insert({ lead_id: leadId, tag_id: tagId, project_id: currentProject.id });
      }
      fetchData();
    } catch (error) {
      console.error('Error toggling tag:', error);
    }
  };

  const openWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone.replace(/[^0-9+]/g, '')}`, '_blank');
  };

  const openEmail = (email: string, name: string) => {
    window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodeURIComponent(`Seguimiento - ${name}`)}`, '_blank');
  };

  const getLeadsForStage = (stageId: string) => {
    return leads.filter(lead => {
      const stage = lead.pipeline_status || 'nuevo';
      const matchesStage = stage === stageId;
      const matchesSearch = !searchTerm ||
        `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = !filterTag ||
        lead.tags?.some(t => t.tag_id === filterTag);
      return matchesStage && matchesSearch && matchesTag;
    });
  };

  const handleDragStart = (leadId: string) => {
    setDraggedLead(leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedLead) {
      moveLeadToStage(draggedLead, stageId);
      setDraggedLead(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div className="flex items-center gap-3 flex-1 w-full md:w-auto">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setFilterTag(null)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                    !filterTag ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => setFilterTag(filterTag === tag.id ? null : tag.id)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                      filterTag === tag.id ? 'text-white' : 'text-gray-700 hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: filterTag === tag.id ? tag.color : `${tag.color}20`,
                      color: filterTag === tag.id ? '#fff' : tag.color,
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowTagManager(!showTagManager)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors"
          >
            <Tag size={16} />
            Etiquetas
          </button>
        </div>

        {showTagManager && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                placeholder="Nueva etiqueta..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                className="flex-1 max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-1">
                {TAG_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewTagColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${newTagColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button onClick={addTag} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
                <Plus size={16} />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span key={tag.id} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: tag.color }}>
                    {tag.name}
                    <button onClick={() => deleteTag(tag.id)} className="ml-1 hover:bg-white/20 rounded-full p-0.5">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-h-[60vh]">
        {PIPELINE_STAGES.map(stage => {
          const stageLeads = getLeadsForStage(stage.id);
          return (
            <div
              key={stage.id}
              className="flex flex-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className={`bg-gradient-to-r ${stage.color} rounded-t-2xl px-4 py-3 shadow-lg`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">{stage.label}</h3>
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {stageLeads.length}
                  </span>
                </div>
              </div>
              <div className={`flex-1 ${stage.bgLight} ${stage.border} border-2 border-t-0 rounded-b-2xl p-2 space-y-2 overflow-y-auto max-h-[65vh]`}>
                {stageLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    stage={stage}
                    tags={tags}
                    onOpenDetail={() => setContactDetailLead(lead)}
                    onMoveLeft={() => {
                      const idx = PIPELINE_STAGES.findIndex(s => s.id === stage.id);
                      if (idx > 0) moveLeadToStage(lead.id, PIPELINE_STAGES[idx - 1].id);
                    }}
                    onMoveRight={() => {
                      const idx = PIPELINE_STAGES.findIndex(s => s.id === stage.id);
                      if (idx < PIPELINE_STAGES.length - 1) moveLeadToStage(lead.id, PIPELINE_STAGES[idx + 1].id);
                    }}
                    onWhatsApp={lead.phone ? () => openWhatsApp(lead.phone!) : undefined}
                    onEmail={lead.email ? () => openEmail(lead.email!, `${lead.first_name} ${lead.last_name}`) : undefined}
                    onToggleTag={(tagId) => toggleLeadTag(lead.id, tagId)}
                    onDragStart={() => handleDragStart(lead.id)}
                    isFirst={PIPELINE_STAGES.findIndex(s => s.id === stage.id) === 0}
                    isLast={PIPELINE_STAGES.findIndex(s => s.id === stage.id) === PIPELINE_STAGES.length - 1}
                  />
                ))}
                {stageLeads.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <GripVertical size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-medium">Arrastra leads aqui</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ContactDetail
        lead={contactDetailLead}
        isOpen={!!contactDetailLead}
        onClose={() => { setContactDetailLead(null); fetchData(); }}
      />
    </div>
  );
}

function LeadCard({
  lead,
  stage,
  tags,
  onOpenDetail,
  onMoveLeft,
  onMoveRight,
  onWhatsApp,
  onEmail,
  onToggleTag,
  onDragStart,
  isFirst,
  isLast,
}: {
  lead: LeadWithTags;
  stage: typeof PIPELINE_STAGES[number];
  tags: ProjectTag[];
  onOpenDetail: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onWhatsApp?: () => void;
  onEmail?: () => void;
  onToggleTag: (tagId: string) => void;
  onDragStart: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [showTags, setShowTags] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
    >
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <button
            onClick={onOpenDetail}
            className="font-bold text-sm text-gray-900 hover:text-blue-600 transition-colors text-left leading-tight"
          >
            {lead.first_name} {lead.last_name}
          </button>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isFirst && (
              <button onClick={onMoveLeft} className="p-1 hover:bg-gray-100 rounded" title="Mover atras">
                <ChevronLeft size={14} className="text-gray-500" />
              </button>
            )}
            {!isLast && (
              <button onClick={onMoveRight} className="p-1 hover:bg-gray-100 rounded" title="Mover adelante">
                <ChevronRight size={14} className="text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {lead.tags && lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {lead.tags.map(lt => lt.project_tags && (
              <span
                key={lt.tag_id}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white"
                style={{ backgroundColor: lt.project_tags.color }}
              >
                {lt.project_tags.name}
              </span>
            ))}
          </div>
        )}

        {lead.form_type && (
          <p className="text-xs text-gray-500 mb-2 truncate">{lead.form_type}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {onWhatsApp && (
              <button onClick={onWhatsApp} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                <MessageCircle size={14} />
              </button>
            )}
            {onEmail && (
              <button onClick={onEmail} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Mail size={14} />
              </button>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Phone size={14} />
              </a>
            )}
          </div>
          <button
            onClick={() => setShowTags(!showTags)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Tag size={14} />
          </button>
        </div>

        {showTags && tags.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
            {tags.map(tag => {
              const isActive = lead.tags?.some(t => t.tag_id === tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => onToggleTag(tag.id)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                    isActive ? 'text-white' : 'opacity-50 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: isActive ? tag.color : `${tag.color}30`,
                    color: isActive ? '#fff' : tag.color,
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
