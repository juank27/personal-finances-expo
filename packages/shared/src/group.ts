export type GroupMemberRole = "owner" | "member";
export type InvitationStatus = "pending" | "accepted" | "rejected";

export interface Group {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupMemberRole;
}

export interface Invitation {
  id: string;
  group_id: string;
  invited_by: string;
  email: string;
  token: string;
  status: InvitationStatus;
  expires_at: string;
}
