import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface Props {
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}

export function AppLayout({ children, headerExtra }: Props) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border bg-card sticky top-0 z-30 px-2 gap-3">
            <SidebarTrigger />
            {headerExtra}
          </header>
          <main className="flex-1 p-4 sm:p-6 space-y-5 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
