import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClientsService } from './clients.service';
import { ClientRequestsService } from './client-requests.service';
import { Client } from './entities/client.entity';
import {
  ClientRequest,
  ClientRequestStatus,
  ClientRequestType,
} from './entities/client-request.entity';
import { UserClientMembership } from './entities/user-client-membership.entity';
import { User } from '../auth/entities/user.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Order } from '../orders/entities/order.entity';
import { LinesService } from '../lines/lines.service';
import { UserRole } from '../common/enums';
import { requestAudit } from './client-audit';

describe('Client audit across approval', () => {
  const submittedAt = new Date('2026-10-10T09:35:28Z');
  const approvedAt = new Date('2026-10-10T09:42:11Z');
  const agent = Object.assign(new User(), {
    id: 'agent-user', username: 'agent', fullName: 'Olimov Odiljon',
    role: UserRole.DISTRIBUTOR,
  });
  const admin = Object.assign(new User(), {
    id: 'admin-user', username: 'admin', fullName: 'Javlon', role: UserRole.ADMIN,
  });
  let clients: ClientsService;
  let requests: ClientRequestsService;
  let client: Client;
  let request: ClientRequest;
  const clientRepo = {
    save: jest.fn(async (row: Client) => row),
    create: jest.fn((row: Partial<Client>) => Object.assign(new Client(), row)),
    findOne: jest.fn(async () => null),
    createQueryBuilder: jest.fn(),
  };
  const requestRepo = {
    save: jest.fn(async (row: ClientRequest) => { request = row; return row; }),
    create: jest.fn((row: Partial<ClientRequest>) => Object.assign(new ClientRequest(), { id: 'new-request' }, row)),
    findOne: jest.fn(async (): Promise<ClientRequest | null> => null),
    find: jest.fn(async (): Promise<ClientRequest[]> => []),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    requestRepo.findOne.mockResolvedValue(null);
    requestRepo.find.mockResolvedValue([]);
    jest.useFakeTimers().setSystemTime(approvedAt);
    client = Object.assign(new Client(), {
      id: 'client-1', name: 'Store', fullName: 'Store', latitude: 40.1, longitude: 65.3,
      createdAt: new Date('2026-08-10T18:52:00Z'),
      createdById: 'original-author', createdByName: 'Original Author',
      locationUpdatedAt: new Date('2026-08-10T18:52:00Z'),
      locationUpdatedById: 'original-author', locationUpdatedByName: 'Original Author',
    });
    request = Object.assign(new ClientRequest(), {
      id: 'request-1', status: ClientRequestStatus.PENDING,
      requestType: ClientRequestType.UPDATE, targetClientId: client.id,
      name: client.name, latitude: 40.2, longitude: 65.4,
      agentName: agent.fullName, submitterPosition: 'Agent',
      distributor: Object.assign(new DistributorProfile(), { userId: agent.id, user: agent }),
      createdAt: submittedAt, updatedAt: submittedAt,
      submissionAudit: {
        change: { userId: agent.id, userName: agent.fullName, changedAt: submittedAt.toISOString() },
        location: { userId: agent.id, userName: agent.fullName, changedAt: submittedAt.toISOString() },
      },
      reviewedBy: null, reviewedAt: null,
    });
    const module = await Test.createTestingModule({
      providers: [
        ClientsService, ClientRequestsService,
        { provide: getRepositoryToken(Client), useValue: clientRepo },
        { provide: getRepositoryToken(ClientRequest), useValue: requestRepo },
        { provide: getRepositoryToken(UserClientMembership), useValue: {} },
        { provide: getRepositoryToken(Order), useValue: {} },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn(async () => agent) } },
        { provide: LinesService, useValue: {} },
      ],
    }).compile();
    clients = module.get(ClientsService);
    requests = module.get(ClientRequestsService);
    jest.spyOn(clients, 'findOne').mockImplementation(async () => client);
    jest.spyOn(requests, 'findOne').mockImplementation(async () => request);
    jest.spyOn(requests, 'checkInnDuplicate').mockResolvedValue({
      duplicate: false, existingClient: null, existingRequest: null,
    });
  });

  afterEach(() => jest.useRealTimers());

  it.each([admin, Object.assign(new User(), admin, { id: 'other-admin', fullName: 'Other Admin' })])(
    'keeps the GPS editor when $fullName approves', async reviewer => {
    const result = await requests.approve(request.id, reviewer.fullName, reviewer);
    expect(result.client.locationUpdatedById).toBe(agent.id);
    expect(result.client.locationUpdatedByName).toBe(agent.fullName);
    expect(result.client.locationUpdatedAt).toEqual(submittedAt);
    expect(result.request.reviewedBy).toBe(reviewer.fullName);
    expect(result.request.reviewedAt).toEqual(approvedAt);
    expect(result.client.createdById).toBe('original-author');
    expect(result.client.createdAt).toEqual(new Date('2026-08-10T18:52:00Z'));
    expect(result.client.changeAudit?.change).toMatchObject({
      userId: agent.id, changedAt: submittedAt.toISOString(), status: 'approved',
      approvedById: reviewer.id, approvedByName: reviewer.fullName,
      approvedAt: approvedAt.toISOString(),
    });
  });

  it('does not change GPS audit when a text-only request is approved', async () => {
    const oldGps = client.locationUpdatedAt;
    request.name = 'Updated Store';
    request.latitude = client.latitude;
    request.longitude = client.longitude;
    request.submissionAudit!.location = null;
    await requests.approve(request.id, admin.fullName, admin);
    expect(client.name).toBe('Updated Store');
    expect(client.changeAudit?.change?.userId).toBe(agent.id);
    expect(client.locationUpdatedAt).toEqual(oldGps);
    expect(client.locationUpdatedById).toBe('original-author');
  });

  it('keeps the submitter as the creator and GPS author when a new client is approved', async () => {
    request.requestType = ClientRequestType.CREATE;
    request.targetClientId = null;
    clientRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(), getMany: jest.fn(async () => []),
    });
    clientRepo.save.mockImplementationOnce(async row => {
      client = Object.assign(new Client(), { id: 'new-client' }, row);
      return client;
    });
    const result = await requests.approve(request.id, admin.fullName, admin);
    expect(result.client.createdById).toBe(agent.id);
    expect(result.client.createdByName).toBe(agent.fullName);
    expect(result.client.locationUpdatedById).toBe(agent.id);
    expect(result.client.locationUpdatedAt).toEqual(submittedAt);
    expect(result.client.changeAudit?.location?.approvedById).toBe(admin.id);
  });

  it('records direct edits without fabricating approval and ignores no-op saves', async () => {
    await clients.update(client.id, { latitude: 40.5 }, admin);
    const gpsAudit = client.changeAudit?.location;
    expect(gpsAudit).toEqual({
      userId: admin.id, userName: admin.fullName, changedAt: approvedAt.toISOString(), status: 'direct',
    });
    jest.setSystemTime(new Date('2026-10-10T10:00:00Z'));
    await clients.update(client.id, { name: 'Renamed Store', latitude: 40.5 }, agent);
    expect(client.changeAudit?.location).toEqual(gpsAudit);
    expect(client.locationUpdatedAt).toEqual(approvedAt);
    const lastChange = client.changeAudit?.change;
    jest.setSystemTime(new Date('2026-10-10T11:00:00Z'));
    await clients.update(client.id, { name: 'Renamed Store', latitude: 40.5 }, admin);
    expect(client.changeAudit?.change).toEqual(lastChange);
    expect(client.createdById).toBe('original-author');
  });

  it('keeps GPS approval separate when a later direct text edit occurs', async () => {
    await requests.approve(request.id, admin.fullName, admin);
    const gpsAudit = client.changeAudit?.location;
    await clients.update(client.id, { phone: '+998 90 123 45 67' }, admin);
    expect(client.changeAudit?.change?.status).toBe('direct');
    expect(client.changeAudit?.change?.approvedById).toBeUndefined();
    expect(client.changeAudit?.location).toEqual(gpsAudit);
  });

  it('uses the authenticated author and leaves pending changes unapplied', async () => {
    jest.setSystemTime(submittedAt);
    await requests.createUpdate(client.id, { name: 'Pending Store', latitude: 40.2 }, undefined, 'Forged Name', undefined, agent);
    expect(request.submissionAudit?.change).toEqual({
      userId: agent.id, userName: agent.fullName, changedAt: submittedAt.toISOString(),
    });
    expect(client.name).toBe('Store');
    expect(client.latitude).toBe(40.1);
    expect(requestAudit(request).change?.status).toBe('pending');
    expect(requestAudit(request).change?.approvedByName).toBeUndefined();
  });

  it('does not apply rejected requests or expose the reviewer as an approver', async () => {
    await requests.reject(request.id, admin.fullName);
    expect(client.latitude).toBe(40.1);
    expect(client.changeAudit).toBeUndefined();
    expect(request.status).toBe(ClientRequestStatus.REJECTED);
    expect(requestAudit(request).location?.status).toBe('rejected');
    expect(requestAudit(request).location?.approvedByName).toBeUndefined();
    await expect(requests.approve(request.id, admin.fullName, admin)).rejects.toThrow();
  });

  it('tracks pending edits separately from the author who changed the GPS', async () => {
    request.previousSnapshot = { latitude: client.latitude, longitude: client.longitude };
    requestRepo.findOne.mockResolvedValue(request);
    const manager = Object.assign(new User(), admin, { id: 'manager-user', role: UserRole.MANAGER });
    await requests.createUpdate(client.id, { name: 'Manager Edit', latitude: 40.2, longitude: 65.4 }, undefined, manager.fullName, undefined, manager);
    expect(request.submissionAudit?.change.userId).toBe(manager.id);
    expect(request.submissionAudit?.location?.userId).toBe(agent.id);
    expect(request.submissionAudit?.location?.changedAt).toBe(submittedAt.toISOString());
    await requests.approve(request.id, admin.fullName, admin);
    expect(client.changeAudit?.change?.userId).toBe(manager.id);
    expect(client.locationUpdatedById).toBe(agent.id);
  });

  it('clears review metadata on resubmission without replacing the GPS author', async () => {
    request.previousSnapshot = { latitude: client.latitude, longitude: client.longitude };
    await requests.reject(request.id, admin.fullName);
    await requests.resubmit(request.id, { name: 'Resubmitted Store' }, undefined, agent.fullName, 'Agent', agent);
    expect(request.status).toBe(ClientRequestStatus.PENDING);
    expect(request.reviewedBy).toBeNull();
    expect(request.reviewedAt).toBeNull();
    expect(request.submissionAudit?.change.changedAt).toBe(approvedAt.toISOString());
    expect(request.submissionAudit?.location?.changedAt).toBe(submittedAt.toISOString());
    expect(requestAudit(request).location?.approvedAt).toBeUndefined();
  });

  it('does not guess a legacy edit time or replace an unknown author with the admin', async () => {
    request.submissionAudit = null;
    request.distributor = null;
    request.agentName = null;
    request.previousSnapshot = { latitude: client.latitude, longitude: client.longitude };
    await requests.approve(request.id, admin.fullName, admin);
    expect(client.changeAudit?.change).toMatchObject({ userId: null, userName: null, changedAt: null });
    expect(client.locationUpdatedByName).toBeNull();
    expect(client.createdById).toBe('original-author');
  });

  it('keeps legacy client/GPS values intact while exposing a pending request separately', async () => {
    const qb = { leftJoinAndSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getOne: jest.fn(async () => client) };
    clientRepo.createQueryBuilder.mockReturnValue(qb);
    requestRepo.find.mockResolvedValue([request]);
    jest.spyOn(clients, 'findOne').mockRestore();
    const result = await clients.findOne(client.id);
    expect(result.requestedAudit?.change?.status).toBe('pending');
    expect(result.requestedAudit?.location?.approvedByName).toBeUndefined();
    expect(result.locationUpdatedByName).toBe('Original Author');
    expect(result.createdByName).toBe('Original Author');
    expect(result.changeAudit).toBeUndefined();
  });
});
