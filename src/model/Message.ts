export interface Message {
  id?: number;
  isRead?: boolean;
  userFromId?: number;
  userToId?: number;
  subject?: string;
  body?: string;
  dateCreated?: string;
  deleted?: boolean;
  replyToId?: number;
  threadId?: number;
}
