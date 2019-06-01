export interface Report {
  id?: number;
  type?: string;
  targetId?: string;
  report?: string;
  reporterId?: string;
  answeredById?: string;
  dateCreated?: string;
  dateAnswered?: string;
}
