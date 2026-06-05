export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col">
      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-content px-4 py-8">{children}</div>
      </div>
    </div>
  );
}
