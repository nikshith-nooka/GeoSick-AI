import React, { useState, useEffect } from 'react';
import type { MunicipalTicket, Page } from '../types';
import { localDb } from '../services/localSqlDb';
import { exportAuditReportToPrint } from '../services/pdfExportService';
import { 
  ShieldCheckIcon, 
  HazardIcon, 
  CheckCircleIcon, 
  CloseIcon, 
  ScanIcon,
  DocumentChartBarIcon,
  GlobeIcon
} from './icons';
import { BackButton } from './BackButton';
import { EmptyState } from './EmptyState';

interface MunicipalTicketsPageProps {
  onBack: () => void;
  onNavigate?: (page: Page) => void;
}

export const MunicipalTicketsPage: React.FC<MunicipalTicketsPageProps> = ({ onBack, onNavigate }) => {
  const [tickets, setTickets] = useState<MunicipalTicket[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<MunicipalTicket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newHazardType, setNewHazardType] = useState<string>('Stagnant Water Pool & Aedes Breeding Risk');
  const [newSeverity, setNewSeverity] = useState<MunicipalTicket['severity']>('Priority 1 (High Vector Risk)');
  const [newCoordinates, setNewCoordinates] = useState<string>('17.3850° N, 78.4867° E (Ward 12, Hyderabad)');
  const [newAssignedTeam, setNewAssignedTeam] = useState<string>('Vector Control & Drainage Squad #4');
  const [newSummary, setNewSummary] = useState<string>('Field officer reported severe stagnation with high mosquito larva density.');

  const loadTickets = () => {
    const list = localDb.getTickets();
    setTickets([...list]);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleUpdateStatus = (ticketId: string, status: MunicipalTicket['status'], note?: string) => {
    localDb.updateTicketStatus(ticketId, status, note || `Status updated to ${status} on ${new Date().toLocaleTimeString()}`);
    loadTickets();
  };

  const handleDeleteTicket = (ticketId: string) => {
    if (confirm(`Are you sure you want to remove ticket #${ticketId}?`)) {
      localDb.deleteTicket(ticketId);
      loadTickets();
      if (selectedTicket?.ticket_id === ticketId) {
        setSelectedTicket(null);
      }
    }
  };

  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const genTicketId = `GEO-INC-${Math.floor(100000 + Math.random() * 900000)}`;
    localDb.createTicket({
      ticket_id: genTicketId,
      hazard_type: newHazardType,
      severity: newSeverity,
      status: 'Dispatched',
      assigned_team: newAssignedTeam,
      coordinates: newCoordinates,
      summary: newSummary,
      created_at: new Date().toISOString()
    });
    setIsCreateModalOpen(false);
    loadTickets();
  };

  const filteredTickets = tickets.filter(t => {
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
    const matchesSeverity = filterSeverity === 'All' || t.severity.includes(filterSeverity);
    const matchesSearch = 
      t.ticket_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.hazard_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.coordinates.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assigned_team.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSeverity && matchesSearch;
  });

  const countTotal = tickets.length;
  const countDispatched = tickets.filter(t => t.status === 'Dispatched').length;
  const countInProgress = tickets.filter(t => t.status === 'In-Progress').length;
  const countResolved = tickets.filter(t => t.status === 'Resolved').length;
  const countP1 = tickets.filter(t => t.severity.includes('Priority 1')).length;

  return (
    <div className="w-full min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col bg-slate-50 animate-fade-in">
      <div className="w-full max-w-7xl mx-auto self-start mb-6 flex items-center justify-between">
        <BackButton onClick={onBack}>Back</BackButton>
        {onNavigate && (
          <button
            onClick={() => onNavigate('image-analysis')}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-all"
          >
            <ScanIcon className="w-4 h-4" />
            Launch Area Scanner
          </button>
        )}
      </div>

      <header className="w-full max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
                <ShieldCheckIcon className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Municipal Incident Command Center
                </h1>
                <p className="text-sm text-slate-600 mt-0.5">
                  B2B Environmental Remediation Work Orders, Vector Squad Telemetry & Compliance Audit
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <HazardIcon className="w-4 h-4" />
              + Dispatch New Incident
            </button>
          </div>
        </div>

        {/* Telemetry Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Total Work Orders</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{countTotal}</p>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
              <span>Automated & Field</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-sm">
            <p className="text-xs font-medium text-amber-700">🚨 Dispatched (Pending)</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{countDispatched}</p>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-600 font-medium">
              <span>Awaiting Field Arrival</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-blue-200/80 bg-blue-50/20 shadow-sm">
            <p className="text-xs font-medium text-blue-700">⚙️ In-Progress Remediation</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{countInProgress}</p>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-blue-600 font-medium">
              <span>Crew Active on Site</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-sm">
            <p className="text-xs font-medium text-emerald-700">✅ Resolved & Sanitized</p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{countResolved}</p>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-600 font-medium">
              <span>{countP1} Priority 1 Mitigated</span>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto flex-grow flex flex-col">
        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1">Status:</span>
            {['All', 'Dispatched', 'In-Progress', 'Resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterStatus === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search by ID, Ward, Hazard, Squad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Tickets Grid */}
        {filteredTickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTickets.map((ticket) => {
              const isP1 = ticket.severity.includes('Priority 1');
              const isResolved = ticket.status === 'Resolved';
              const isInProgress = ticket.status === 'In-Progress';

              return (
                <div
                  key={ticket.id || ticket.ticket_id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                        #{ticket.ticket_id}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                          isResolved
                            ? 'bg-emerald-100 text-emerald-800'
                            : isInProgress
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}
                      >
                        {ticket.status === 'Dispatched' ? '🚨 Dispatched' : ticket.status === 'In-Progress' ? '⚙️ In-Progress' : '✅ Resolved'}
                      </span>
                    </div>

                    {/* Hazard Title */}
                    <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2">
                      {ticket.hazard_type}
                    </h3>

                    {/* Severity Badge */}
                    <div className="mt-2.5">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                          isP1
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ticket.severity}
                      </span>
                    </div>

                    {/* Location & Team */}
                    <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                      <p className="flex items-center gap-1.5">
                        <GlobeIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{ticket.coordinates}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <ShieldCheckIcon className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                        <span className="font-medium text-slate-700 truncate">{ticket.assigned_team}</span>
                      </p>
                    </div>

                    {/* Summary */}
                    <p className="mt-3 text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {ticket.summary}
                    </p>

                    {ticket.resolution_notes && (
                      <p className="mt-2 text-[11px] text-emerald-700 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                        <span className="font-semibold">Note:</span> {ticket.resolution_notes}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() =>
                        exportAuditReportToPrint({
                          ticketId: ticket.ticket_id,
                          analysis: {
                            hazards: [{ hazard: ticket.hazard_type, description: ticket.summary }],
                            diseases: [{ name: 'Vector-Borne Pathogen', cause: ticket.hazard_type, precautions: ['Larviciding', 'Drain clearing'] }],
                            summary: ticket.summary
                          },
                          timestamp: new Date(ticket.created_at).toLocaleString()
                        })
                      }
                      className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1"
                    >
                      <DocumentChartBarIcon className="w-3.5 h-3.5 text-slate-500" />
                      PDF Log
                    </button>

                    <div className="flex items-center gap-1.5">
                      {ticket.status !== 'Resolved' && (
                        <button
                          onClick={() => handleUpdateStatus(ticket.ticket_id, ticket.status === 'Dispatched' ? 'In-Progress' : 'Resolved')}
                          className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all shadow-sm ${
                            ticket.status === 'Dispatched'
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {ticket.status === 'Dispatched' ? 'Start Remediation' : 'Mark Sanitized'}
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteTicket(ticket.ticket_id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all"
                        title="Delete ticket"
                      >
                        <CloseIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="🎫"
            title="No Municipal Work Orders Found"
            subtitle="No incident work orders match your search or filters. Dispatch tickets directly from the Area Hazard Scanner or create a manual work order."
            actionLabel="+ Dispatch New Ticket"
            onAction={() => setIsCreateModalOpen(true)}
            secondaryActionLabel={onNavigate ? "Scan Area for Hazards" : undefined}
            onSecondaryAction={onNavigate ? () => onNavigate('image-analysis') : undefined}
          />
        )}
      </main>

      {/* Manual Dispatch Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HazardIcon className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Dispatch Municipal Remediation Work Order</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hazard Classification</label>
                <input
                  type="text"
                  required
                  value={newHazardType}
                  onChange={(e) => setNewHazardType(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Priority 1 (High Vector Risk)">Priority 1 (High Vector Risk)</option>
                    <option value="Priority 2 (Moderate Risk)">Priority 2 (Moderate Risk)</option>
                    <option value="Priority 3 (Advisory)">Priority 3 (Advisory)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Response Team</label>
                  <input
                    type="text"
                    required
                    value={newAssignedTeam}
                    onChange={(e) => setNewAssignedTeam(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telemetry Coordinates & Ward</label>
                <input
                  type="text"
                  required
                  value={newCoordinates}
                  onChange={(e) => setNewCoordinates(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Field Summary / Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
