export interface GetReportParams {
  page: number;
  limit: number;
  orderCol?: string;
  orderDir?: "ASC" | "DESC";

  id?: number;

  answered?: boolean;
}
