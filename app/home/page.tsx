export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <main className="flex-1 p-6 bg-neutral-100">
        <h1 className="text-3xl font-bold mb-6">Welcome to Business Dashboard</h1>
        <p className="text-lg mb-4">
          This is your central hub for managing tasks, tracking time, accessing resources, and taking notes.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Quick Links</h2>
            <ul className="list-disc list-inside">
              <li>View and manage tasks</li>
              <li>Log your time</li>
              <li>Access team resources</li>
              <li>Create and edit notes</li>
            </ul>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Recent Activity</h2>
            <p>Your recent activity will be displayed here.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
