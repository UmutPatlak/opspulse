import { type Task } from '../../../database/schema';

export interface AssignedUserInfo {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface TaskWithAssignedUser extends Task {
  assignedUser: AssignedUserInfo | null;
}
