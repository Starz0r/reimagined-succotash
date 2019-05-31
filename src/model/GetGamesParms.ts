export interface GetGamesParms {
  page: number;
  limit: number;
  orderCol?: string;
  orderDir?: "ASC" | "DESC";

  id?: number;
  ownerUserId?: number;

  name?: string;
  removed?: boolean;

  tags?: string[];
  author?: string;
  hasDownload?: boolean;
  createdFrom?: string;
  createdTo?: string;
  clearedByUserId?: number;
  reviewedByUserId?: number;

  ratingFrom?: number;
  ratingTo?: number;
  difficultyFrom?: number;
  difficultyTo?: number;
}