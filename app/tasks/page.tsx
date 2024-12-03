import { DashboardComponent } from "@/components/Tasks/dashboard"

export default function TasksPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Remove Header component */}
      <div className="flex-grow">
        <DashboardComponent />
      </div>
    </div>
  )
}
