import LoginForm from "./LoginForm";

type LoginPageProps = {
    searchParams: Promise<{
        passwordReset?: string;
        activated?: string;
        registered?: string;
        callbackUrl?: string;
    }>;
};

function safeCallbackUrl(value?: string) {
    if (
        !value ||
        !value.startsWith("/") ||
        value.startsWith("//")
    ) {
        return "/post-login";
    }

    /*
     * Prevent a callback loop if an invalid login URL
     * was supplied as the destination.
     */
    if (
        value === "/login" ||
        value.startsWith("/login?")
    ) {
        return "/post-login";
    }

    return value;
}

export default async function LoginPage({
    searchParams,
}: LoginPageProps) {
    const params = await searchParams;

    return (
        <main className="bg-slate-50">
            <LoginForm
                passwordReset={
                    params.passwordReset === "true"
                }
                accountActivated={
                    params.activated === "true"
                }
                registered={
                    params.registered === "true"
                }
                callbackUrl={safeCallbackUrl(
                    params.callbackUrl,
                )}
            />
        </main>
    );
}