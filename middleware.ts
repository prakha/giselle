import { retrieveStripeSubscriptionBySupabaseUserId } from "@/services/accounts/actions";
import { NextResponse } from "next/server";
import { supabaseMiddleware } from "./lib/supabase";

export default supabaseMiddleware(async (user, request) => {
	if (user == null) {
		// no user, potentially respond by redirecting the user to the login page
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		return NextResponse.redirect(url);
	}
	const subscription = await retrieveStripeSubscriptionBySupabaseUserId(
		user.id,
	);
	if (subscription == null) {
		const url = request.nextUrl.clone();
		url.pathname = "/subscriptions/checkout";
		return NextResponse.redirect(url);
	}
	/** @todo Validate subscription status */
});

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|dev|webhooks|login|signup|pricing|password_reset|subscription|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
