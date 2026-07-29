export enum DistributorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_ROUTE = 'on_route',
  OFFLINE = 'offline',
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  DISTRIBUTOR = 'distributor',
  CLIENT = 'client',
}

export enum VisitStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum OrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PACKING = 'packing',
  ON_WAY = 'on_way',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum OrderSource {
  AGENT = 'agent',
  CLIENT = 'client',
}

export enum PaymentMethod {
  CASH = 'cash',
  TERMINAL = 'terminal',
  DEFERRED = 'deferred',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum OrderPaymentStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
}

export enum OrderReturnStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  FAILED = 'failed',
}
