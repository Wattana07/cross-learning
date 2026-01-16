import { supabase } from '@/lib/supabaseClient'

export interface ServiceStatus {
  name: string
  status: 'online' | 'offline' | 'degraded'
  responseTime?: number
  message?: string
  lastChecked: string
}

export interface SystemStatus {
  database: ServiceStatus
  storage: ServiceStatus
  auth: ServiceStatus
  edgeFunctions: ServiceStatus
  overall: 'online' | 'offline' | 'degraded'
  timestamp: string
}

// Check database connection
async function checkDatabase(): Promise<ServiceStatus> {
  const startTime = Date.now()
  try {
    const { error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    const responseTime = Date.now() - startTime

    if (error) {
      return {
        name: 'Database',
        status: 'offline',
        responseTime,
        message: error.message,
        lastChecked: new Date().toISOString(),
      }
    }

    return {
      name: 'Database',
      status: responseTime > 1000 ? 'degraded' : 'online',
      responseTime,
      lastChecked: new Date().toISOString(),
    }
  } catch (error: any) {
    return {
      name: 'Database',
      status: 'offline',
      message: error.message || 'Connection failed',
      lastChecked: new Date().toISOString(),
    }
  }
}

// Check storage
async function checkStorage(): Promise<ServiceStatus> {
  const startTime = Date.now()
  try {
    const { data, error } = await supabase.storage.listBuckets()

    const responseTime = Date.now() - startTime

    if (error) {
      return {
        name: 'Storage',
        status: 'offline',
        responseTime,
        message: error.message,
        lastChecked: new Date().toISOString(),
      }
    }

    return {
      name: 'Storage',
      status: responseTime > 1000 ? 'degraded' : 'online',
      responseTime,
      message: `${data?.length || 0} buckets available`,
      lastChecked: new Date().toISOString(),
    }
  } catch (error: any) {
    return {
      name: 'Storage',
      status: 'offline',
      message: error.message || 'Connection failed',
      lastChecked: new Date().toISOString(),
    }
  }
}

// Check auth
async function checkAuth(): Promise<ServiceStatus> {
  const startTime = Date.now()
  try {
    const { data, error } = await supabase.auth.getSession()

    const responseTime = Date.now() - startTime

    if (error && error.message !== 'Invalid Refresh Token' && error.message !== 'JWT expired') {
      return {
        name: 'Authentication',
        status: 'offline',
        responseTime,
        message: error.message,
        lastChecked: new Date().toISOString(),
      }
    }

    return {
      name: 'Authentication',
      status: responseTime > 1000 ? 'degraded' : 'online',
      responseTime,
      message: data.session ? 'Authenticated' : 'Not authenticated',
      lastChecked: new Date().toISOString(),
    }
  } catch (error: any) {
    return {
      name: 'Authentication',
      status: 'offline',
      message: error.message || 'Connection failed',
      lastChecked: new Date().toISOString(),
    }
  }
}

// Check edge functions (test with a simple function)
async function checkEdgeFunctions(): Promise<ServiceStatus> {
  const startTime = Date.now()
  try {
    // Try to invoke a simple function or check function list
    // For now, we'll just check if the functions endpoint is accessible
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const functionsUrl = `${supabaseUrl}/functions/v1/`
    
    const response = await fetch(functionsUrl, {
      method: 'GET',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      },
    })

    const responseTime = Date.now() - startTime

    if (!response.ok && response.status !== 404) {
      return {
        name: 'Edge Functions',
        status: 'offline',
        responseTime,
        message: `HTTP ${response.status}`,
        lastChecked: new Date().toISOString(),
      }
    }

    return {
      name: 'Edge Functions',
      status: responseTime > 2000 ? 'degraded' : 'online',
      responseTime,
      lastChecked: new Date().toISOString(),
    }
  } catch (error: any) {
    return {
      name: 'Edge Functions',
      status: 'offline',
      message: error.message || 'Connection failed',
      lastChecked: new Date().toISOString(),
    }
  }
}

// Get overall system status
export async function fetchSystemStatus(): Promise<SystemStatus> {
  try {
    const [database, storage, auth, edgeFunctions] = await Promise.all([
      checkDatabase(),
      checkStorage(),
      checkAuth(),
      checkEdgeFunctions(),
    ])

    // Determine overall status
    const services = [database, storage, auth, edgeFunctions]
    const offlineCount = services.filter(s => s.status === 'offline').length
    const degradedCount = services.filter(s => s.status === 'degraded').length

    let overall: 'online' | 'offline' | 'degraded' = 'online'
    if (offlineCount > 0) {
      overall = 'offline'
    } else if (degradedCount > 0) {
      overall = 'degraded'
    }

    return {
      database,
      storage,
      auth,
      edgeFunctions,
      overall,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Error checking system status:', error)
    throw error
  }
}

