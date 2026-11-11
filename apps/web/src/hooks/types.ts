export interface PaginationParams {
 page: number;
 limit: number;
 sortBy?: string;
 sortOrder?: 'asc' | 'desc';
 search?: string;
 includeInactive?: boolean;
 status?: string;
 healthCenterId?: string;
}

export interface PaginatedResponse<T> {
 data: T[];
 total: number;
}
