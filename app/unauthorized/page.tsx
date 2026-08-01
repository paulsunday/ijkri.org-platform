export default function UnauthorizedPage() {
    return (
        <main className="flex min-h-[70vh] items-center justify-center px-6 py-16">
            <div className="w-full max-w-xl rounded-lg border p-6 sm:p-8">
                <h1 className="text-3xl font-bold">
                    Unauthorized
                </h1>

                <p className="mt-4">
                    You do not have permission to access this page.
                </p>
            </div>
        </main>
    );
}
