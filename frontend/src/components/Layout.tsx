import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { motion } from 'framer-motion'

export function Layout() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5"
        >
          <div className="container mx-auto px-6 py-8">
            <Outlet />
          </div>
        </motion.main>
      </div>
    </div>
  )
}