export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: {
    message: string;
    code: string;
  };
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}
