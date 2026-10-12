import type { User } from '../auth/entities/user.entity';
import type { ClientRequest } from './entities/client-request.entity';

export interface ClientAuditActor {
  userId: string | null;
  userName: string | null;
  changedAt: string | null;
}

export interface ClientAuditEntry extends ClientAuditActor {
  status: 'direct' | 'pending' | 'approved' | 'rejected';
  requestId?: string;
  approvedById?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
}

export interface ClientAudit {
  change: ClientAuditEntry | null;
  location: ClientAuditEntry | null;
}

export interface ClientSubmissionAudit {
  change: ClientAuditActor;
  location: ClientAuditActor | null;
}

export function auditActor(actor?: User, at = new Date()): ClientAuditActor {
  return {
    userId: actor?.id ?? null,
    userName: actor?.fullName?.trim() || actor?.username?.trim() || null,
    changedAt: at.toISOString(),
  };
}

export function sameLocation(
  a: { latitude?: number | null; longitude?: number | null },
  b: { latitude?: number | null; longitude?: number | null },
): boolean {
  const same = (x?: number | null, y?: number | null) =>
    x == null && y == null || x != null && y != null && Math.abs(Number(x) - Number(y)) < 1e-7;
  return same(a.latitude, b.latitude) && same(a.longitude, b.longitude);
}

export function requestAudit(
  request: ClientRequest,
  status: 'pending' | 'approved' | 'rejected' = request.status,
  reviewer?: User,
  reviewedAt?: Date,
): ClientAudit {
  // Legacy logs identify the author, but cannot prove the last resubmission time.
  const author: ClientAuditActor = request.submissionAudit?.change ?? {
    userId: request.distributor?.userId ?? null,
    userName: request.agentName?.trim() || null,
    changedAt: null,
  };
  const previous = request.previousSnapshot ?? {};
  const legacyLocationChanged = !sameLocation(request, {
    latitude: previous.latitude as number | null | undefined,
    longitude: previous.longitude as number | null | undefined,
  });
  const location = request.submissionAudit
    ? request.submissionAudit.location
    : legacyLocationChanged ? author : null;
  const entry = (source: ClientAuditActor): ClientAuditEntry => ({
    userId: source.userId,
    userName: source.userName,
    changedAt: source.changedAt,
    status,
    requestId: request.id,
    ...(status === 'approved' ? {
      approvedById: reviewer?.id ?? null,
      approvedByName: reviewer?.fullName?.trim() || reviewer?.username?.trim() || request.reviewedBy || null,
      approvedAt: (reviewedAt ?? request.reviewedAt)?.toISOString() ?? null,
    } : {}),
  });
  return { change: entry(author), location: location ? entry(location) : null };
}
