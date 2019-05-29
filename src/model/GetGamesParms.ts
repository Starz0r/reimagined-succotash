export interface GetGamesParms {
  page: number;
  limit: number;
  name?: string;
  removed?: boolean;
  orderCol?: string;
  orderDir?: "ASC" | "DESC";
}
