import { db, stripeUserMappings, supabaseUserMappings, users } from "@/drizzle";
import { getUser } from "@/lib/supabase";
import { isEmailFromRoute06 } from "@/lib/utils";
import { createCheckout } from "@/services/external/stripe/actions";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export const GET = async () => {
	const supabaseUser = await getUser();
	if (supabaseUser.email == null) {
		throw new Error("No email found for user");
	}
	if (isEmailFromRoute06(supabaseUser.email)) {
		redirect("/");
	}
	const [user] = await db
		.select({ id: users.id })
		.from(users)
		.innerJoin(
			supabaseUserMappings,
			eq(supabaseUserMappings.userDbId, users.dbId),
		)
		.where(eq(supabaseUserMappings.supabaseUserId, supabaseUser.id));
	if (user == null) {
		throw new Error("No user found");
	}
	const checkout = await createCheckout(user.id, supabaseUser.email);
	redirect(checkout.url as string);
};
