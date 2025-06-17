import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HomeIcon } from '@heroicons/react/24/outline'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.h1
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-9xl font-bold text-gradient"
        >
          404
        </motion.h1>
        
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-2xl font-semibold"
        >
          Page Not Found
        </motion.p>
        
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-2 text-muted-foreground"
        >
          The page you're looking for doesn't exist or has been moved.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Link to="/" className="btn-primary inline-flex items-center">
            <HomeIcon className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
        </motion.div>

        {/* Decorative elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
              className="h-96 w-96 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl"
            />
          </div>
        </div>
      </motion.div>
    </div>
  )
}