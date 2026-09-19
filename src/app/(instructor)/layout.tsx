export default function InstructorLayout(	{
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
