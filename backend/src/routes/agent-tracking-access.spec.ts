import { Repository } from 'typeorm';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { AgentTrackingService } from './agent-tracking.service';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/enums';

describe('Daily tracking access', () => {
  const tracking = { getDaily: jest.fn().mockResolvedValue({}) };
  const profile = { id: 'agent1', companyId: 'org1', companyIds: ['org2'] };
  const controller = new RoutesController({} as RoutesService, tracking as unknown as AgentTrackingService,
    { findOne: async () => profile } as unknown as Repository<DistributorProfile>);
  const user = (role: UserRole, companies: string[] = [], agentId = 'other') => Object.assign(new User(), {
    role, distributorProfile: Object.assign(new DistributorProfile(), { id: agentId, companyIds: companies }),
  });
  beforeEach(() => tracking.getDaily.mockClear());
  it('rejects customer accounts and another agent’s GPS data', async () => {
    for (const role of [UserRole.CLIENT, UserRole.DISTRIBUTOR]) {
      await expect(controller.getTracking({ user: user(role) }, 'agent1', '2026-10-13')).rejects.toThrow();
    }
    expect(tracking.getDaily).not.toHaveBeenCalled();
  });
  it('rejects managers outside the agent’s companies, including a forged company query', async () => {
    await expect(controller.getTracking({ user: user(UserRole.MANAGER, ['org3']) }, 'agent1', '2026-10-13', 'org1')).rejects.toThrow();
    expect(tracking.getDaily).not.toHaveBeenCalled();
  });
  it('allows a manager’s secondary shared company and passes only authorized scope', async () => {
    await controller.getTracking({ user: user(UserRole.MANAGER, ['org2']) }, 'agent1', '2026-10-13', 'org1,org2');
    expect(tracking.getDaily).toHaveBeenCalledWith('agent1', '2026-10-13', ['org2']);
  });
});
