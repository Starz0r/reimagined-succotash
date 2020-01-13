export interface Report {
  id?: number;
  type?: string;
  targetId?: string;
  report?: string;
  reporterId?: string;
  reporterName?: string;
  answeredById?: string;
  answeredByName?: string;
  dateCreated?: string;
  dateAnswered?: string;
}
