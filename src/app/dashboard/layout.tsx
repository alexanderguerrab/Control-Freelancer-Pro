import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen max-md:flex-col">
      <Sidebar />
      <main className="ml-[260px] flex-grow p-8 overflow-y-auto h-screen box-border
        max-md:ml-0 max-md:w-full max-md:p-4 max-md:h-auto">
        {children}
      </main>
    </div>
  )
}
