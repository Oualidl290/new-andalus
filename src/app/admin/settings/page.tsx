'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SimpleSelect as Select } from '@/components/ui/select'
import { Settings, Globe, Mail, Shield, Database } from 'lucide-react'

export default function SettingsPage() {
  const [timezone, setTimezone] = useState('UTC')
  const [smtpSecurity, setSmtpSecurity] = useState('tls')
  // Note: In a real app, you'd check authentication here

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Configure your site settings and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <nav className="space-y-2">
              <a
                href="#general"
                className="flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md"
              >
                <Globe className="w-4 h-4 mr-3" />
                General
              </a>
              <a
                href="#email"
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              >
                <Mail className="w-4 h-4 mr-3" />
                Email
              </a>
              <a
                href="#security"
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              >
                <Shield className="w-4 h-4 mr-3" />
                Security
              </a>
              <a
                href="#advanced"
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              >
                <Database className="w-4 h-4 mr-3" />
                Advanced
              </a>
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          <div id="general" className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Globe className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="site-title">Site Title</Label>
                <Input
                  id="site-title"
                  defaultValue="New Andalus"
                  placeholder="Enter site title"
                />
              </div>

              <div>
                <Label htmlFor="site-description">Site Description</Label>
                <Textarea
                  id="site-description"
                  defaultValue="A modern editorial platform for content creators"
                  placeholder="Enter site description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="site-url">Site URL</Label>
                <Input
                  id="site-url"
                  defaultValue="https://newandalus.com"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                </Select>
              </div>

              <div className="pt-4">
                <Button>Save General Settings</Button>
              </div>
            </div>
          </div>

          {/* Email Settings */}
          <div id="email" className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Mail className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Email Settings</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="from-email">From Email Address</Label>
                <Input
                  id="from-email"
                  type="email"
                  defaultValue="noreply@newandalus.com"
                  placeholder="noreply@example.com"
                />
              </div>

              <div>
                <Label htmlFor="from-name">From Name</Label>
                <Input
                  id="from-name"
                  defaultValue="New Andalus"
                  placeholder="Your Site Name"
                />
              </div>

              <div>
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  id="smtp-host"
                  placeholder="smtp.example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    defaultValue="587"
                    placeholder="587"
                  />
                </div>
                <div>
                  <Label htmlFor="smtp-security">Security</Label>
                  <Select value={smtpSecurity} onValueChange={setSmtpSecurity}>
                    <option value="none">None</option>
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                  </Select>
                </div>
              </div>

              <div className="pt-4">
                <Button>Save Email Settings</Button>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div id="security" className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Shield className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  defaultValue="1440"
                  placeholder="1440"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How long users stay logged in (default: 24 hours)
                </p>
              </div>

              <div>
                <Label>Password Requirements</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    <span className="text-sm">Minimum 8 characters</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    <span className="text-sm">Require uppercase letter</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    <span className="text-sm">Require number</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">Require special character</span>
                  </label>
                </div>
              </div>

              <div>
                <Label>Two-Factor Authentication</Label>
                <div className="mt-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">Enable 2FA for all admin users</span>
                  </label>
                </div>
              </div>

              <div className="pt-4">
                <Button>Save Security Settings</Button>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div id="advanced" className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Database className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="cache-ttl">Cache TTL (seconds)</Label>
                <Input
                  id="cache-ttl"
                  type="number"
                  defaultValue="3600"
                  placeholder="3600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How long to cache content (default: 1 hour)
                </p>
              </div>

              <div>
                <Label htmlFor="max-upload-size">Max Upload Size (MB)</Label>
                <Input
                  id="max-upload-size"
                  type="number"
                  defaultValue="10"
                  placeholder="10"
                />
              </div>

              <div>
                <Label>Debug Mode</Label>
                <div className="mt-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">Enable debug logging</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Danger Zone</h4>
                <div className="space-y-2">
                  <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                    Clear All Cache
                  </Button>
                  <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                    Export Database
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Settings className="w-6 h-6 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-900">Settings Configuration</h3>
            <p className="text-sm text-yellow-700 mt-1">
              This is a demo settings interface. In production, these settings would be stored in your 
              database and environment configuration, with proper validation and security measures.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Metadata would be handled by the parent layout in a real app