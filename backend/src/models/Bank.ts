export interface Bank {
    id: number;
    user_id: number;
    name: string;
    color: string | null;
    created_at: Date;
    cards_count?: number;
}
