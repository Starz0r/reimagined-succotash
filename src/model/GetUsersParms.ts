export interface GetUsersParms {
  page: number;
  limit: number;
  orderCol?: string;
  orderDir?: "ASC" | "DESC";

  id?: number;
  followerUserId?: number;
}