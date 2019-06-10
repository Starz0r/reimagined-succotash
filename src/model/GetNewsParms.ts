export interface GetNewsParms {
  page: number;
  limit: number;
  orderCol?: string;
  orderDir?: "ASC" | "DESC";

  id?: number;
  removed?: boolean;
}