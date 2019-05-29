export interface GetListsParms {
  page: number;
  limit: number;
  userId?: number;
  gameId?: number;
  orderCol?: string;
  orderDir?: "ASC" | "DESC";
}
