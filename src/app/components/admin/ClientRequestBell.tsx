import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, Check, X, User, AlertTriangle, Maximize2, Minimize2,
  ChevronDown, Clock3, Loader2, ShieldCheck, Inbox, RefreshCw,
} from 'lucide-react';
import { useClientRequests, ClientRequestProvider } from '../ClientRequestContext';
import { useCompanies } from '../CompaniesContext';
import { useAdminAuth } from '../AdminAuthContext';
import { api, resolveFileUrl } from '../../api/client';
import { getClientRequestCompareRows, resolvePreviousSnapshot, snapshotFromApiClient, type ClientRequestItem, type ClientRequestSnapshot } from '../../data/clientRequests';
import { formatDisplayDateTime } from '../../utils/dateFormat';
import type { ClientRow } from '../../data/adminData';
import './ClientRequestBell.css';

interface Props {
  D: boolean;
  sub: string;
  text: string;
  t: Record<string, string>;
  existingClients?: ClientRow[];
  companyId?: string;
}

const EMPTY_CLIENTS: ClientRow[] = [];

type PhotoPreview = { src: string; name: string; label: string };

function RequestPhotoPreview({ photo, t, lockScroll, onClose }: {
  photo: PhotoPreview;
  t: Record<string, string>;
  lockScroll: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = 'hidden';
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (lockScroll) document.body.style.overflow = previousOverflow;
    };
  }, [lockScroll]);

  return (
    <dialog ref={dialogRef} className="client-request-photo-preview" aria-labelledby={titleId}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Tab') {
          e.preventDefault();
          dialogRef.current?.querySelector('button')?.focus();
        }
      }}
      onCancel={e => { e.preventDefault(); onClose(); }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <figure className="client-request-photo-content">
        <div className="client-request-photo-header">
          <div><h3 id={titleId}>{t.colPhoto} · {photo.label}</h3><p>{photo.name}</p></div>
          <button type="button" autoFocus onClick={onClose} className="client-request-icon-button" aria-label={t.notifClose} title={t.notifClose}><X size={18} /></button>
        </div>
        <div className="client-request-photo-stage">
          {loading && <div className="client-request-photo-status" role="status"><Loader2 size={24} className="client-request-spin" /><span>{t.loading}</span></div>}
          {failed ? <div className="client-request-photo-status" role="alert"><AlertTriangle size={24} /><span>{t.notifPhotoLoadFailed}</span></div> : (
            <img src={photo.src} alt={`${photo.name} · ${photo.label}`} onLoad={() => setLoading(false)} onError={() => { setLoading(false); setFailed(true); }} />
          )}
        </div>
      </figure>
    </dialog>
  );
}

function RequestCard({ item, t, existingClients, companyId, onDone, onPreview }: {
  item: ClientRequestItem;
  t: Record<string, string>;
  existingClients: ClientRow[];
  companyId?: string;
  onDone: () => void;
  onPreview: (photo: PhotoPreview) => void;
}) {
  const { checkInn, approve, reject, processing } = useClientRequests();
  const busy = processing[item.id];
  const actionLock = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [details, setDetails] = useState(false);
  const detailsId = useId();
  const [fetchedPrev, setFetchedPrev] = useState<{ clientId: string; snapshot: ClientRequestSnapshot } | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState(false);
  const [snapshotRetry, setSnapshotRetry] = useState(0);
  const isUpdate = item.requestType === 'update';
  const fallbackSnapshot = fetchedPrev && fetchedPrev.clientId === item.targetClientId ? fetchedPrev.snapshot : null;

  useEffect(() => {
    if (!isUpdate || !item.targetClientId || item.previousSnapshot) return;
    if (resolvePreviousSnapshot(item, existingClients, fallbackSnapshot)) return;
    const clientId = item.targetClientId;
    let cancelled = false;
    setSnapshotLoading(true);
    setSnapshotError(false);
    void api.getClient(clientId)
      .then(c => {
        if (!cancelled) {
          setFetchedPrev({ clientId, snapshot: snapshotFromApiClient(c) });
          setSnapshotLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSnapshotError(true);
          setSnapshotLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [isUpdate, item.targetClientId, item.previousSnapshot, existingClients, fallbackSnapshot, snapshotRetry]);

  const prev = resolvePreviousSnapshot(item, existingClients, fallbackSnapshot);
  const compareRows = getClientRequestCompareRows(item, isUpdate ? prev : {}, t);
  const changedRows = compareRows.filter(row => row.changed);
  const mainRows = isUpdate ? changedRows : changedRows.slice(0, 3);
  const detailRows = compareRows.filter(row => !mainRows.includes(row));
  const dup = checkInn(item.inn, item.id, existingClients, isUpdate ? item.targetClientId : null);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (actionLock.current || busy || (action === 'approve' && dup.duplicate)) return;
    actionLock.current = true;
    setActionError(null);
    try {
      if (action === 'approve') {
        if (await approve(item.id, companyId, existingClients)) onDone();
        else setActionError(t.notifApproveFailed);
      } else {
        await reject(item.id);
        onDone();
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : (
        action === 'approve' ? t.notifApproveFailed : t.notifRejectFailed
      ));
    } finally {
      actionLock.current = false;
    }
  };

  const renderValue = (key: string, value: string, old = false) => {
    // Keep the actual photo URL available alongside the comparison helper's label.
    const photo = key === 'photoUrl' ? (old ? prev?.photoUrl : item.photoUrl) : null;
    if (photo) {
      const label = old ? t.notifOldValue : t.notifNewValue;
      return <button type="button" className="client-request-photo-link"
        aria-label={`${t.colPhoto}: ${label} · ${item.name}`}
        onClick={() => onPreview({ src: resolveFileUrl(photo), name: item.name, label })}>{photo}</button>;
    }
    return photo || value;
  };

  return (
    <article className="client-request-card" aria-busy={!!busy}>
      <div className="client-request-badges">
        <span className={`client-request-badge ${isUpdate ? 'is-edit' : 'is-new'}`}>
          {isUpdate ? t.notifTypeEdit : t.notifTypeNew}
        </span>
        <span className="client-request-pending"><span />{t.notifPending}</span>
      </div>
      <h3 className="client-request-name">{item.name}</h3>
      {item.fullName && item.fullName !== item.name && <p className="client-request-full-name">{item.fullName}</p>}
      <div className="client-request-meta">
        <p><User size={13} /><span>{item.submitterPosition?.trim() || t.notifAgent}: <strong>{item.agentName || '—'}</strong></span></p>
        <p><Clock3 size={13} /><time dateTime={item.createdAt}>{formatDisplayDateTime(item.createdAt) || '—'} <span>(UTC+5)</span></time></p>
      </div>
      <div className="client-request-section-label">
        <span>{isUpdate ? t.notifChanges : t.notifClientData}</span>
        <span className="client-request-field-count">{isUpdate && !prev ? '—' : changedRows.length}</span>
      </div>
      {isUpdate && !prev ? (
        <div className="client-request-snapshot" role={snapshotError ? 'alert' : 'status'}>
          {snapshotLoading ? <Loader2 size={15} className="client-request-spin" /> : <AlertTriangle size={15} />}
          <span>{snapshotLoading ? t.notifLoading : t.notifComparisonUnavailable}</span>
          {snapshotError && <button type="button" className="client-request-text-button" onClick={() => setSnapshotRetry(v => v + 1)}>{t.notifRetry}</button>}
        </div>
      ) : mainRows.length === 0 ? (
        <p className="client-request-muted-message">{t.notifNoFieldChanges}</p>
      ) : (
        <dl className="client-request-changes">
          {mainRows.map(row => (
            <div key={row.key} className="client-request-change">
              <dt>{row.label}</dt>
              <dd>
                {isUpdate && <div className="client-request-old"><span>{t.notifOldValue}</span><div>{renderValue(row.key, row.from, true)}</div></div>}
                <div className="client-request-new"><span>{t.notifNewValue}</span><div>{renderValue(row.key, row.to)}</div></div>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {(detailRows.length > 0 || item.note || (isUpdate && !prev)) && (
        <div className="client-request-details">
          <button type="button" className="client-request-details-toggle" aria-expanded={details} aria-controls={detailsId} onClick={() => setDetails(v => !v)}>
            {t.notifDetails}<ChevronDown size={14} className={details ? 'is-rotated' : ''} />
          </button>
          <dl id={detailsId} hidden={!details} className="client-request-detail-list">
            {(isUpdate && !prev ? getClientRequestCompareRows(item, {}, t) : detailRows).map(row => (
              <div key={row.key}><dt>{row.label}</dt><dd>{renderValue(row.key, row.to)}</dd></div>
            ))}
            {item.note && <div><dt>{t.colNote}</dt><dd>{item.note}</dd></div>}
          </dl>
        </div>
      )}
      {actionError && <div className="client-request-warning" role="alert"><AlertTriangle size={15} /><span>{actionError}</span></div>}
      {dup.duplicate && (
        <div className="client-request-warning" role="alert">
          <AlertTriangle size={15} />
          <span>{dup.reason === 'client_exists' ? t.notifInnExists : t.notifInnPending}
            {dup.existingClient && <strong>{dup.existingClient.name}</strong>}
          </span>
        </div>
      )}
      <div className="client-request-actions">
        <button type="button" className="client-request-approve" disabled={!!busy || dup.duplicate} onClick={() => void handleAction('approve')}>
          {busy === 'approve' ? <Loader2 size={15} className="client-request-spin" /> : <Check size={15} />}{t.notifApprove}
        </button>
        <button type="button" className="client-request-reject" disabled={!!busy} onClick={() => void handleAction('reject')}>
          {busy === 'reject' ? <Loader2 size={15} className="client-request-spin" /> : <X size={15} />}{t.notifDecline}
        </button>
      </div>
    </article>
  );
}

export function ClientRequestBell(props: Props) {
  return <ClientRequestProvider companyId={props.companyId}><ClientRequestBellInner {...props} /></ClientRequestProvider>;
}

function ClientRequestBellInner({ D, t, existingClients = EMPTY_CLIENTS, companyId }: Props) {
  const { pending, loading, error, refresh } = useClientRequests();
  const { companies, refresh: refreshCompanies } = useCompanies();
  const { selectedCompany, selectCompany } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<PhotoPreview | null>(null);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [savingSkip, setSavingSkip] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const count = pending.length;
  const closePanel = () => { setOpen(false); setExpanded(false); setPhotoPreview(null); };

  const effectiveCompanyId = companyId ?? selectedCompany?.id ?? undefined;
  const company = companies.find(c => c.id === effectiveCompanyId)
    ?? (selectedCompany?.id === effectiveCompanyId ? selectedCompany : null);
  const skipApproval = !!company?.clientsAddWithoutApproval;
  const adminReviewOn = !skipApproval;

  const toggleAdminReview = async () => {
    if (!effectiveCompanyId || savingSkip) return;
    setSavingSkip(true);
    setSkipError(null);
    const nextSkipApproval = adminReviewOn;
    try {
      const updated = await api.updateCompany(effectiveCompanyId, { clientsAddWithoutApproval: nextSkipApproval });
      await refreshCompanies();
      if (selectedCompany?.id === effectiveCompanyId) {
        selectCompany({ ...selectedCompany, clientsAddWithoutApproval: !!updated.clientsAddWithoutApproval });
      }
    } catch (e) {
      setSkipError(e instanceof Error ? e.message : t.notifSaveFailed);
    } finally {
      setSavingSkip(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    expandRef.current?.focus();
    const reposition = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    reposition();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); setExpanded(false); setPhotoPreview(null); }
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', reposition);
      // Wait for the modal effect to restore the background's inert state.
      requestAnimationFrame(() => btnRef.current?.focus());
    };
  }, [open]);

  useEffect(() => {
    if (!open || !expanded) return;
    closeRef.current?.focus();
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + scrollbar}px`;
    const siblings = Array.from(body.children)
      .filter((el): el is HTMLElement => el instanceof HTMLElement && el !== panelRef.current && el !== overlayRef.current)
      .map(el => ({ el, inert: el.inert }));
    siblings.forEach(({ el }) => { el.inert = true; });
    const focusable = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], [tabindex="0"]',
    ) ?? []).filter(el => el.getClientRects().length > 0);
    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    const keepFocus = (e: FocusEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) closeRef.current?.focus();
    };
    document.addEventListener('keydown', trapFocus);
    document.addEventListener('focusin', keepFocus);
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      siblings.forEach(({ el, inert }) => { el.inert = inert; });
      document.removeEventListener('keydown', trapFocus);
      document.removeEventListener('focusin', keepFocus);
      expandRef.current?.focus();
    };
  }, [open, expanded]);

  const rect = btnRef.current?.getBoundingClientRect();
  const width = Math.min(380, viewport.width - 32);
  const top = Math.min(rect ? rect.bottom + 8 : 66, Math.max(16, viewport.height - 240));
  const compactStyle: CSSProperties = {
    top,
    left: Math.max(16, Math.min((rect?.right ?? viewport.width - 16) - width, viewport.width - width - 16)),
    width,
    maxHeight: Math.min(viewport.height * .7, 520, viewport.height - top - 16),
  };

  // Keep the same portal and keyed cards mounted when toggling size.
  const panel = open && createPortal(
    <>
      <div ref={overlayRef} className={`client-request-overlay ${expanded ? 'is-expanded' : ''}`} onClick={closePanel} aria-hidden="true" />
      <div ref={panelRef} id={panelId} role="dialog" aria-modal={expanded || undefined}
        aria-labelledby={`${panelId}-title`} aria-describedby={`${panelId}-description`}
        className={`client-request-panel ${D ? 'is-dark' : ''} ${expanded ? 'is-expanded' : ''}`}
        style={expanded ? { top: '3dvh', left: '2vw', width: '96vw', height: '94dvh', maxHeight: '94dvh' } : compactStyle}>
        <div className="client-request-header">
          <div className="client-request-heading-row">
            <div className="client-request-heading">
              <div className="client-request-heading-icon"><Bell size={20} /></div>
              <div><h2 id={`${panelId}-title`}>{t.notifTitle}</h2><p className="client-request-count" role="status">{t.notifPending}: <strong>{count}</strong></p></div>
            </div>
            <div className="client-request-window-actions">
              <button ref={expandRef} type="button" onClick={() => setExpanded(v => !v)} className="client-request-icon-button" title={expanded ? t.notifMinimize : t.notifMaximize} aria-label={expanded ? t.notifMinimize : t.notifMaximize}>
                {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
              <button ref={closeRef} type="button" onClick={closePanel} className="client-request-icon-button" title={t.notifClose} aria-label={t.notifClose}><X size={18} /></button>
            </div>
          </div>
          <p id={`${panelId}-description`} className="client-request-subtitle">{t.notifSubtitle}</p>
          {effectiveCompanyId ? (
            <div className="client-request-review-settings">
              <button type="button" role="switch" aria-checked={adminReviewOn} disabled={savingSkip}
                onClick={() => void toggleAdminReview()} className={`client-request-review-toggle ${adminReviewOn ? 'is-on' : ''}`}>
                <ShieldCheck size={17} /><span>{t.notifAdminReview}</span>
                {savingSkip && <Loader2 size={14} className="client-request-spin" />}
                <span className="client-request-switch"><span /></span>
              </button>
              <p>{adminReviewOn ? t.notifAdminReviewOnHint : t.notifAdminReviewOffHint}</p>
              {skipError && <p className="client-request-setting-error" role="alert">{skipError}</p>}
            </div>
          ) : <p className="client-request-subtitle">{t.notifSelectOneOrg}</p>}
        </div>
        <div className="client-request-body show-sb" aria-busy={loading}>
          {error && <div className="client-request-panel-error" role="alert"><AlertTriangle size={18} /><span>{error}</span><button type="button" disabled={loading} onClick={() => void refresh()}><RefreshCw size={14} />{t.notifRetry}</button></div>}
          {loading && count === 0 && !error && <div className="client-request-state" role="status"><Loader2 size={30} className="client-request-spin" /><p>{t.notifLoading}</p></div>}
          {!loading && count === 0 && !error && <div className="client-request-state"><div className="client-request-empty-icon"><Inbox size={30} /></div><h3>{t.notifEmpty}</h3><p>{t.notifEmptyHint}</p></div>}
          <div className="client-request-grid">
            {pending.map(item => <RequestCard key={item.id} item={item} t={t} existingClients={existingClients} companyId={companyId} onPreview={setPhotoPreview} onDone={() => { if (!expandedRef.current) closePanel(); }} />)}
          </div>
        </div>
        {photoPreview && <RequestPhotoPreview photo={photoPreview} t={t} lockScroll={!expanded} onClose={() => setPhotoPreview(null)} />}
      </div>
    </>, document.body,
  );

  return <>
    <button ref={btnRef} type="button" onClick={e => { e.stopPropagation(); if (open) closePanel(); else setOpen(true); }}
      title={t.notifTitle} aria-label={t.notifTitle} aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? panelId : undefined}
      className={`relative w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-colors ${open ? 'bg-indigo-600 text-white' : D ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
      <Bell size={16} />
      {count > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: '#ef4444' }}>{count > 9 ? '9+' : count}</span>}
    </button>
    {panel}
  </>;
}
