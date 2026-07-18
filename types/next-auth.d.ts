import type { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";

type JournalRoleAssignment = {
    role: string;
    journalId: string;
};

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            roles: JournalRoleAssignment[];
        } & DefaultSession["user"];
    }

    interface User {
        roles?: JournalRoleAssignment[];
        passwordChangedAt?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        userId?: string;
        roles?: JournalRoleAssignment[];
        passwordChangedAt?: string | null;
    }
}