import LoginForm from "./LoginForm";

type LoginPageProps = {
    searchParams: Promise<{
        passwordReset?: string;
        accountActivated?: string;
        registered?: string;
        activationRequired?: string;
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
                    params.accountActivated === "true"
                }
                registered={
                    params.registered === "true"
                }
                activationRequired={
                    params.activationRequired === "true"
                }
                callbackUrl={safeCallbackUrl(
                    params.callbackUrl,
                )}
            />
        </main>
    );
}