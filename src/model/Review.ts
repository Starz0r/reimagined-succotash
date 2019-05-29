export interface Review {
  id?: number;
  userId?: number;
  gameId?: number;
  rating?: number;
  difficulty?: number;
  comment?: string;
  date_created?: string;
  removed?: boolean;
}
