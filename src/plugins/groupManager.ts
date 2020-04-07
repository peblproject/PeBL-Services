import { GroupManager } from "../interfaces/groupManager"
import { PeBLPlugin } from "../models/peblPlugin";
import { MessageTemplate } from "../models/messageTemplate";
import { Group } from "../models/group";
import { Role } from "../models/role";
import { GroupRole } from "../models/groupRole";

export class DefaultGroupManager extends PeBLPlugin implements GroupManager {

  constructor() {
    super();
    this.addMessageTemplate(new MessageTemplate("addGroup", {
      "id": "string",
      "groupName": "string",
      "groupDescription": "string",
      "groupAvatar": "?string"
    }));
  }

  addGroup(id: string, groupName: string, groupDescription: string, groupAvatar?: string): void {

  }

  deleteGroup(id: string): void {

  }

  updateGroup(id: string, groupName?: string, groupDescription?: string, groupAvatar?: string): void {

  }

  addGroupMember(id: string, userId: string, role: string): void {

  }

  deleteGroupMember(id: string, userId: string): void {

  }

  updateGroupMember(id: string, userId: string, role: string): void {

  }

  getGroups(callback: ((groups: Group[]) => void)): void {

  }

  createGroupRole(id: string, roleName: string, permissions: Role[]): void {

  }

  updateGroupRole(id: string, roleName?: string, permissions?: Role[]): void {

  }

  deleteGroupRole(id: string, roleName: string): void {

  }

  getGroupRoles(id: string, callback: ((groupRoles: GroupRole[]) => void)): void {

  }
}