import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Download, Lock, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useEngine } from '../context/EngineContext';
import { formatCompactNumber, formatDwell, sortRecords, filterRecords } from '../engine/analytics';
import { ROLE_META } from '../engine/rbac';
import type { Channel, PublicationRecord, Region, SortDir, SortKey } from '../engine/types';

const PAGE_SIZE = 8;

interface RecordFormState {
  title: string;
  section: string;
  author: string;
  region: Region;
  channel: Channel;
  publishedAt: string;
  readers: string;
  dwellSeconds: string;
  returningPct: string;
  completionRate: string;
  engagementDelta: string;
  notes: string;
}

const EMPTY_FORM: RecordFormState = {
  title: '',
  section: 'Technology',
  author: 'Elena Vance',
  region: 'Europe',
  channel: 'Web',
  publishedAt: '2026-11-19',
  readers: '125000',
  dwellSeconds: '410',
  returningPct: '70.5',
  completionRate: '78.0',
  engagementDelta: '21.4',
  notes: '',
};

export const DataTableView: React.FC = () => {
  const { state, setFilters, resetFilters, can, addRecord, updateRecord, deleteRecord, exportRecords } = useEngine();
  const [sortKey, setSortKey] = useState<SortKey>('readers');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecordFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = useMemo(
    () => sortRecords(filterRecords(state.records, state.filters), sortKey, sortDir),
    [state.records, state.filters, sortKey, sortDir]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const canWrite = can('dataset:write');
  const canDelete = can('dataset:delete');
  const canExport = can('dataset:export');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, author: state.session?.name ?? 'Elena Vance' });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (rec: PublicationRecord) => {
    setEditingId(rec.id);
    setForm({
      title: rec.title,
      section: rec.section,
      author: rec.author,
      region: rec.region,
      channel: rec.channel,
      publishedAt: rec.publishedAt,
      readers: String(rec.readers),
      dwellSeconds: String(rec.dwellSeconds),
      returningPct: String(rec.returningPct),
      completionRate: String(rec.completionRate),
      engagementDelta: String(rec.engagementDelta),
      notes: rec.notes,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const readers = Number(form.readers);
    const dwellSeconds = Number(form.dwellSeconds);
    const returningPct = Number(form.returningPct);
    const completionRate = Number(form.completionRate);
    const engagementDelta = Number(form.engagementDelta);

    if (!form.title.trim()) {
      setFormError('Publication title is required.');
      return;
    }
    if (!Number.isFinite(readers) || readers <= 0) {
      setFormError('Readers must be a positive number.');
      return;
    }
    if (!Number.isFinite(dwellSeconds) || dwellSeconds < 10) {
      setFormError('Median dwell must be at least 10 seconds.');
      return;
    }

    try {
      const payload = {
        title: form.title.trim(),
        section: form.section.trim() || 'General',
        author: form.author.trim() || 'Editorial Desk',
        region: form.region,
        channel: form.channel,
        publishedAt: form.publishedAt,
        readers: Math.round(readers),
        dwellSeconds: Math.round(dwellSeconds),
        returningPct: Math.min(100, Math.max(0, Number(returningPct.toFixed(1)))),
        completionRate: Math.min(100, Math.max(0, Number(completionRate.toFixed(1)))),
        engagementDelta: Number(engagementDelta.toFixed(1)),
        notes: form.notes.trim(),
      };

      if (editingId) {
        await updateRecord(editingId, payload);
        setFeedback(`Updated "${payload.title}" and encrypted locally.`);
      } else {
        await addRecord(payload);
        setFeedback(`Added "${payload.title}" to encrypted vault.`);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save record.');
    }
  };

  const handleDelete = async (rec: PublicationRecord) => {
    try {
      await deleteRecord(rec.id);
      setFeedback(`Deleted "${rec.title}" from encrypted vault.`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Delete blocked by RBAC.');
    }
  };

  const handleDownload = (format: 'csv' | 'json') => {
    try {
      const content = exportRecords(format);
      const mime = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meridian-folio-dataset.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedback(`Exported ${filtered.length} records as ${format.toUpperCase()}.`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Export blocked by RBAC.');
    }
  };

  const ariaSortFor = (key: SortKey): 'ascending' | 'descending' | 'none' =>
    sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-stone-200 dark:border-slate-800">
        <div>
          <p className="text-xs text-stone-500 dark:text-slate-400">
            Accessible Dataset Ledger · {filtered.length} of {state.records.length} records shown
          </p>
          <h1 className="mt-1 font-editorial text-3xl sm:text-4xl font-medium text-stone-950 dark:text-white">
            Publication Engagement Ledger
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={!canExport}
            onClick={() => handleDownload('csv')}
            className={`inline-flex items-center gap-1.5 h-10 px-3.5 rounded-md border text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              canExport
                ? 'border-stone-300 dark:border-slate-700 bg-white dark:bg-[#131821] text-stone-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer'
                : 'border-stone-200 dark:border-slate-800 text-stone-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </button>

          <button
            type="button"
            disabled={!canWrite}
            onClick={openCreateModal}
            className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              canWrite
                ? 'bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white cursor-pointer'
                : 'bg-stone-200 dark:bg-slate-800 text-stone-500 dark:text-slate-400 cursor-not-allowed'
            }`}
          >
            {canWrite ? <Plus className="h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
            Add Record
          </button>
        </div>
      </div>

      {/* RBAC Read-Only Notice for Viewers */}
      {!canWrite && (
        <div
          role="status"
          className="rounded-md border border-stone-300 dark:border-slate-700 bg-stone-100/80 dark:bg-[#131821] px-4 py-3 text-xs text-stone-700 dark:text-slate-300 flex items-center gap-2.5"
        >
          <Lock className="h-4 w-4 shrink-0 text-stone-500 dark:text-slate-400" aria-hidden="true" />
          <span>
            Signed in as <strong>{state.session ? ROLE_META[state.session.role].label : 'Guest'}</strong> (read-only).
            Record creation, editing, deletion, and CSV export require Editor or Admin permissions.
          </span>
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className="rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 px-4 py-2.5 text-xs font-medium text-blue-900 dark:text-blue-200 flex items-center justify-between gap-2"
        >
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss notification"
            className="text-blue-700 dark:text-blue-300 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-slate-500"
            aria-hidden="true"
          />
          <label htmlFor="ledger-search" className="sr-only">
            Search publications by title, author, section, or notes
          </label>
          <input
            id="ledger-search"
            type="search"
            value={state.filters.search}
            onChange={(e) => {
              setFilters({ search: e.target.value });
              setPage(1);
            }}
            placeholder="Search title, author, section, or notes…"
            className="w-full h-10 pl-9 pr-3 rounded-md border border-stone-300 dark:border-slate-700 bg-white dark:bg-[#131821] text-sm text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500"
          />
        </div>
        <span className="text-xs font-mono tabular-nums text-stone-500 dark:text-slate-400">
          Page {safePage} of {totalPages}
        </span>
      </div>

      {/* Accessible Data Table */}
      <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821] overflow-hidden">
        {visibleRows.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="font-editorial text-xl font-medium text-stone-900 dark:text-slate-100">
              No publication records match your current query
            </p>
            <p className="mt-1.5 text-xs text-stone-500 dark:text-slate-400">
              Try clearing your search input or resetting regional and channel filters.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 h-9 px-4 rounded-md bg-stone-900 dark:bg-slate-100 text-white dark:text-slate-950 text-xs font-medium cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" aria-label="Publication engagement dataset">
              <caption className="sr-only">
                Sortable table of publication engagement metrics including readers, median dwell time, returning rate, and YoY growth.
              </caption>
              <thead>
                <tr className="border-b border-stone-200 dark:border-slate-800 bg-stone-50/80 dark:bg-[#0F131B] text-xs text-stone-600 dark:text-slate-400">
                  <SortableTh label="Title & Section" sortKey="title" ariaSort={ariaSortFor('title')} onSort={handleSort} />
                  <SortableTh label="Region" sortKey="region" ariaSort={ariaSortFor('region')} onSort={handleSort} />
                  <SortableTh label="Channel" sortKey="channel" ariaSort={ariaSortFor('channel')} onSort={handleSort} />
                  <SortableTh label="Readers" sortKey="readers" align="right" ariaSort={ariaSortFor('readers')} onSort={handleSort} />
                  <SortableTh label="Dwell" sortKey="dwellSeconds" align="right" ariaSort={ariaSortFor('dwellSeconds')} onSort={handleSort} />
                  <SortableTh label="Returning" sortKey="returningPct" align="right" ariaSort={ariaSortFor('returningPct')} onSort={handleSort} />
                  <SortableTh label="YoY Delta" sortKey="engagementDelta" align="right" ariaSort={ariaSortFor('engagementDelta')} onSort={handleSort} />
                  <th scope="col" className="py-3 px-4 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/80 dark:divide-slate-800 text-sm">
                {visibleRows.map((rec) => {
                  const isExpanded = expandedId === rec.id;
                  return (
                    <React.Fragment key={rec.id}>
                      <tr className="hover:bg-stone-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 max-w-[300px]">
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                            className="text-left group cursor-pointer"
                          >
                            <div className="font-medium text-stone-950 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                              {rec.title}
                            </div>
                            <div className="mt-0.5 text-xs text-stone-500 dark:text-slate-400">
                              {rec.section} · {rec.author} · {rec.publishedAt}
                            </div>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-xs text-stone-700 dark:text-slate-300 whitespace-nowrap">
                          {rec.region}
                        </td>
                        <td className="py-3 px-4 text-xs text-stone-700 dark:text-slate-300 whitespace-nowrap">
                          {rec.channel}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs tabular-nums font-medium text-stone-900 dark:text-slate-100 whitespace-nowrap">
                          {rec.readers.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-stone-700 dark:text-slate-300 whitespace-nowrap">
                          {formatDwell(rec.dwellSeconds)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-stone-700 dark:text-slate-300 whitespace-nowrap">
                          {rec.returningPct}%
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono text-xs tabular-nums font-medium whitespace-nowrap ${
                            rec.engagementDelta >= 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {rec.engagementDelta >= 0 ? '+' : ''}
                          {rec.engagementDelta}%
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              disabled={!canWrite}
                              onClick={() => openEditModal(rec)}
                              aria-label={`Edit ${rec.title}`}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                                canWrite
                                  ? 'text-stone-600 dark:text-slate-400 hover:bg-stone-200/70 dark:hover:bg-slate-800 hover:text-stone-950 dark:hover:text-white cursor-pointer'
                                  : 'text-stone-300 dark:text-slate-700 cursor-not-allowed'
                              }`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={!canDelete}
                              onClick={() => void handleDelete(rec)}
                              aria-label={`Delete ${rec.title}`}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                                canDelete
                                  ? 'text-stone-600 dark:text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer'
                                  : 'text-stone-300 dark:text-slate-700 cursor-not-allowed'
                              }`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-stone-50/70 dark:bg-[#0F131B]">
                          <td colSpan={8} className="px-4 py-3.5 text-xs text-stone-600 dark:text-slate-300">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <p className="max-w-2xl leading-relaxed">
                                <strong className="text-stone-900 dark:text-slate-100">Editorial note:</strong>{' '}
                                {rec.notes || 'No editorial annotation recorded.'}
                              </p>
                              <div className="font-mono tabular-nums text-stone-500 dark:text-slate-400">
                                Completion: {rec.completionRate}% · Avg Monthly: {formatCompactNumber(rec.readers / 12)} · ID: {rec.id}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-stone-200 dark:border-slate-800 px-4 py-3 text-xs">
            <span className="text-stone-500 dark:text-slate-400 font-mono tabular-nums">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of{' '}
              {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 rounded-md border border-stone-300 dark:border-slate-700 disabled:opacity-40 text-stone-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-3 rounded-md border border-stone-300 dark:border-slate-700 disabled:opacity-40 text-stone-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Record Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 dark:bg-black/75 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#131821] shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 px-6 py-4">
              <h2 id="record-modal-title" className="font-editorial text-xl font-semibold text-stone-950 dark:text-white">
                {editingId ? 'Edit Publication Record' : 'Add Publication Record'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close record dialog"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div
                  role="alert"
                  className="rounded-md border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3.5 py-2.5 text-xs font-medium text-rose-800 dark:text-rose-200"
                >
                  {formError}
                </div>
              )}

              <div>
                <label htmlFor="rec-title" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  id="rec-title"
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Baltic Offshore Hydrogen Storage Atlas"
                  className="w-full h-10 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-3 text-sm text-stone-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rec-section" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                    Section
                  </label>
                  <input
                    id="rec-section"
                    type="text"
                    required
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                    className="w-full h-10 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-3 text-sm text-stone-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="rec-author" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                    Author
                  </label>
                  <input
                    id="rec-author"
                    type="text"
                    required
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    className="w-full h-10 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-3 text-sm text-stone-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="rec-region" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                    Region
                  </label>
                  <select
                    id="rec-region"
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value as Region })}
                    className="w-full h-10 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-2.5 text-sm text-stone-900 dark:text-slate-100"
                  >
                    <option value="North America">North America</option>
                    <option value="Europe">Europe</option>
                    <option value="Asia-Pacific">Asia-Pacific</option>
                    <option value="Latin America">Latin America</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="rec-channel" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                    Channel
                  </label>
                  <select
                    id="rec-channel"
                    value={form.channel}
                    onChange={(e) => setForm({ ...form, channel: e.target.value as Channel })}
                    className="w-full h-10 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-2.5 text-sm text-stone-900 dark:text-slate-100"
                  >
                    <option value="Web">Web</option>
                    <option value="Mobile">Mobile</option>
                    <option value="Newsletter">Newsletter</option>
                    <option value="Audio">Audio</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="rec-date" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                    Published Date
                  </label>
                  <input
                    id="rec-date"
                    type="date"
                    value={form.publishedAt}
                    onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
                    className="w-full h-10 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-2.5 text-sm text-stone-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="rec-readers" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                    Readers
                  </label>
                  <input
                    id="rec-readers"
                    type="number"
                    min="1"
                    required
                    value={form.readers}
                    onChange={(e) => setForm({ ...form, readers: e.target.value })}
                    className="w-full h-10 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-2.5 font-mono text-sm text-stone-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="rec-dwell" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                    Dwell (sec)
                  </label>
                  <input
                    id="rec-dwell"
                    type="number"
                    min="10"
                    required
                    value={form.dwellSeconds}
                    onChange={(e) => setForm({ ...form, dwellSeconds: e.target.value })}
                    className="w-full h-10 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-2.5 font-mono text-sm text-stone-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="rec-ret" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                    Returning (%)
                  </label>
                  <input
                    id="rec-ret"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={form.returningPct}
                    onChange={(e) => setForm({ ...form, returningPct: e.target.value })}
                    className="w-full h-10 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-2.5 font-mono text-sm text-stone-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="rec-delta" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                    YoY Delta (%)
                  </label>
                  <input
                    id="rec-delta"
                    type="number"
                    step="0.1"
                    value={form.engagementDelta}
                    onChange={(e) => setForm({ ...form, engagementDelta: e.target.value })}
                    className="w-full h-10 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-2.5 font-mono text-sm text-stone-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rec-notes" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                  Editorial Notes
                </label>
                <textarea
                  id="rec-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Context on data methodology or audience response…"
                  className="w-full rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] p-2.5 text-sm text-stone-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-10 px-4 rounded-md border border-stone-300 dark:border-slate-700 text-xs font-medium text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-md bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-xs font-medium text-white cursor-pointer"
                >
                  {editingId ? 'Save Changes' : 'Save & Encrypt Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SortableTh: React.FC<{
  label: string;
  sortKey: SortKey;
  align?: 'left' | 'right';
  ariaSort: 'ascending' | 'descending' | 'none';
  onSort: (key: SortKey) => void;
}> = ({ label, sortKey, align = 'left', ariaSort, onSort }) => (
  <th scope="col" aria-sort={ariaSort} className={`py-3 px-4 font-medium whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}>
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1 hover:text-stone-950 dark:hover:text-white transition-colors cursor-pointer ${
        align === 'right' ? 'flex-row-reverse' : ''
      }`}
    >
      <span>{label}</span>
      <ArrowUpDown
        className={`h-3 w-3 ${ariaSort !== 'none' ? 'text-blue-700 dark:text-blue-400' : 'opacity-45'}`}
        aria-hidden="true"
      />
    </button>
  </th>
);
