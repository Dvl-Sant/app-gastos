export interface SharedGroup {
    id: number;
    user_id: number;
    name: string;
    member_cuota: string;
    due_day: number | null;
    total_cost: string | null;
    created_at: Date;
    // Computados
    members_count?: number;
}

export interface SharedMember {
    id: number;
    group_id: number;
    user_id: number;
    name: string;
    note: string | null;
    active: boolean;
    created_at: Date;
}

export interface SharedPayment {
    id: number;
    group_id: number;
    member_id: number;
    period: string; // YYYY-MM
    amount: string;
    paid_at: Date;
    note: string | null;
    // Computados (joins)
    member_name?: string;
}

export type CreateSharedGroupDTO = Omit<SharedGroup, 'id' | 'user_id' | 'created_at' | 'members_count'>;
export type UpdateSharedGroupDTO = Partial<CreateSharedGroupDTO>;
export type UpdateSharedMemberDTO = Partial<Pick<SharedMember, 'name' | 'note' | 'active'>>;

export const SHARED_GROUP_FIELDS = ['name', 'member_cuota', 'due_day', 'total_cost'] as const;
export const SHARED_MEMBER_FIELDS = ['name', 'note', 'active'] as const;
