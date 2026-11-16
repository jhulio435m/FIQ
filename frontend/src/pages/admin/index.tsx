import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserManagement } from "@/components/admin/user-management"
import { ModerationTab } from "./tabs/ModerationTab"
import { useModerationQueue } from "@/hooks/use-moderation"
import { ResourceStatsTab } from "./tabs/ResourceStatsTab"
import { ReportsTab } from "./tabs/ReportsTab"

export default function Admin() {
  const { data: queue = [] } = useModerationQueue()
  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-brand-900 dark:text-brand-100 mb-8">Panel Administrativo</h1>

      <Tabs defaultValue="pending">
        <TabsList className="mb-6">
          <TabsTrigger value="pending" className="cursor-pointer">
            Moderación
            {queue.length > 0 && (
              <span className="ml-1.5 rounded-full bg-brand-500 px-1.5 text-[10px] font-semibold text-white">{queue.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="resources" className="cursor-pointer">Recursos</TabsTrigger>
          <TabsTrigger value="users" className="cursor-pointer">Usuarios</TabsTrigger>
          <TabsTrigger value="reports" className="cursor-pointer">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <ModerationTab />
        </TabsContent>

        <TabsContent value="resources">
          <ResourceStatsTab />
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-brand-700 dark:text-brand-400 text-lg">Gestión de Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <UserManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
