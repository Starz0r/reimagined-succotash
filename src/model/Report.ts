export interface Report {
  id?: number;
  type?: "game"
        |"game_add"
        |"game_remove"
        |"game_update_url"
        |"game_update_owner"
        |"game_update_creator"
        
        |"user"
        |"user_register"
        |"user_password_change"
        
        |"review"
        |"review_restore"
        
        |"screenshot"
        |"screenshot_remove";
  targetId?: string;
  report?: string;
  reporterId?: string;
  reporterName?: string;
  answeredById?: string;
  answeredByName?: string;
  dateCreated?: string;
  dateAnswered?: string;
}
