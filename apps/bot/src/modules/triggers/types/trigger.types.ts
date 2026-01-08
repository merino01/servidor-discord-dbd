/**
 * Tipos relacionados con triggers
 */
export interface Trigger {
  id: string;
  guildId: string;
  keyword: string;
  response: string;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export interface CreateTriggerDto {
  keyword: string;
  response: string;
}

export interface UpdateTriggerDto {
  keyword?: string;
  response?: string;
  isActive?: boolean;
}
