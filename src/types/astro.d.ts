import type { Session, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			session: Session | null;
			user: User | null;
		}
	}
}

export {};
