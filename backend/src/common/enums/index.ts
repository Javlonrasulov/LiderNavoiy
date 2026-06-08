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
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  FAILED = 'failed',
}
