import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon,
  Cog6ToothIcon,
  BellIcon,
  BellSlashIcon
} from '@heroicons/react/24/outline'
import { useProductivityStore } from './productivityStore'
import { cn } from '../../utils'

export function PomodoroTimer() {
  const {
    currentPomodoro,
    pomodoroSettings,
    completedSessions,
    startPomodoro,
    pausePomodoro,
    resumePomodoro,
    stopPomodoro,
    completePomodoro,
    updatePomodoroSettings
  } = useProductivityStore()

  const [timeLeft, setTimeLeft] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout>()
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (!currentPomodoro) {
      setTimeLeft(pomodoroSettings.workDuration * 60 * 1000)
      return
    }

    const updateTimer = () => {
      if (currentPomodoro.isPaused) return

      const elapsed = Date.now() - currentPomodoro.startTime - currentPomodoro.totalPausedTime
      const remaining = currentPomodoro.duration - elapsed

      if (remaining <= 0) {
        setTimeLeft(0)
        completePomodoro()
        if (pomodoroSettings.soundEnabled && audioRef.current) {
          audioRef.current.play()
        }
      } else {
        setTimeLeft(remaining)
      }
    }

    updateTimer()
    intervalRef.current = setInterval(updateTimer, 100)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [currentPomodoro, completePomodoro, pomodoroSettings.soundEnabled])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const getSessionType = () => {
    if (!currentPomodoro) {
      const isLongBreak = completedSessions > 0 && completedSessions % pomodoroSettings.sessionsUntilLongBreak === 0
      return { type: 'work', label: 'Work Session', next: isLongBreak ? 'longBreak' : 'shortBreak' }
    }

    switch (currentPomodoro.type) {
      case 'work':
        return { type: 'work', label: 'Work Session' }
      case 'shortBreak':
        return { type: 'shortBreak', label: 'Short Break' }
      case 'longBreak':
        return { type: 'longBreak', label: 'Long Break' }
    }
  }

  const sessionInfo = getSessionType()
  const progress = currentPomodoro 
    ? ((currentPomodoro.duration - timeLeft) / currentPomodoro.duration) * 100
    : 0

  return (
    <>
      <audio ref={audioRef} src="/notification.mp3" />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Pomodoro Timer</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updatePomodoroSettings({ soundEnabled: !pomodoroSettings.soundEnabled })}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              {pomodoroSettings.soundEnabled ? (
                <BellIcon className="h-5 w-5" />
              ) : (
                <BellSlashIcon className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Timer Display */}
        <div className="text-center mb-6">
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                className={cn(
                  "transition-all duration-300",
                  sessionInfo.type === 'work' ? 'text-red-500' : 'text-green-500'
                )}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold">{formatTime(timeLeft)}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {sessionInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="flex justify-center gap-4 mb-6 text-sm">
          <div className="text-center">
            <span className="text-gray-500 dark:text-gray-400">Session</span>
            <p className="font-semibold">{completedSessions + 1}</p>
          </div>
          <div className="text-center">
            <span className="text-gray-500 dark:text-gray-400">Today</span>
            <p className="font-semibold">{completedSessions}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2">
          {!currentPomodoro ? (
            <button
              onClick={() => startPomodoro('work')}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <PlayIcon className="h-5 w-5" />
              Start Work
            </button>
          ) : (
            <>
              {currentPomodoro.isPaused ? (
                <button
                  onClick={resumePomodoro}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <PlayIcon className="h-5 w-5" />
                  Resume
                </button>
              ) : (
                <button
                  onClick={pausePomodoro}
                  className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  <PauseIcon className="h-5 w-5" />
                  Pause
                </button>
              )}
              <button
                onClick={stopPomodoro}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <StopIcon className="h-5 w-5" />
                Stop
              </button>
            </>
          )}
        </div>

        {/* Settings */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
            >
              <PomodoroSettings />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

function PomodoroSettings() {
  const { pomodoroSettings, updatePomodoroSettings } = useProductivityStore()
  const [settings, setSettings] = useState(pomodoroSettings)

  const handleSave = () => {
    updatePomodoroSettings(settings)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Work Duration (minutes)
          </label>
          <input
            type="number"
            value={settings.workDuration}
            onChange={(e) => setSettings({ ...settings, workDuration: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            min="1"
            max="60"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Short Break (minutes)
          </label>
          <input
            type="number"
            value={settings.shortBreakDuration}
            onChange={(e) => setSettings({ ...settings, shortBreakDuration: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            min="1"
            max="30"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Long Break (minutes)
          </label>
          <input
            type="number"
            value={settings.longBreakDuration}
            onChange={(e) => setSettings({ ...settings, longBreakDuration: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            min="1"
            max="60"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Sessions Until Long Break
          </label>
          <input
            type="number"
            value={settings.sessionsUntilLongBreak}
            onChange={(e) => setSettings({ ...settings, sessionsUntilLongBreak: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            min="2"
            max="10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.autoStartBreaks}
            onChange={(e) => setSettings({ ...settings, autoStartBreaks: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">Auto-start breaks</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.autoStartWork}
            onChange={(e) => setSettings({ ...settings, autoStartWork: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">Auto-start work sessions</span>
        </label>
      </div>

      <button
        onClick={handleSave}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Save Settings
      </button>
    </div>
  )
}