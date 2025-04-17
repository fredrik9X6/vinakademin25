import React from 'react'
import { User } from '@/payload-types'

interface RoleBasedContentProps {
  user: User
}

const RoleBasedContent: React.FC<RoleBasedContentProps> = ({ user }) => {
  const role = user.role

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold mb-4">Dina aktiviteter</h2>
      {role === 'admin' && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-xl font-medium text-blue-800">Admin Dashboard</h3>
          <p className="text-blue-600 mt-2">Här kan du hantera användare, kurser och mer.</p>
          <div className="mt-4">
            <a
              href="/admin"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Gå till adminpanelen
            </a>
          </div>
        </div>
      )}

      {role === 'student' && (
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-xl font-medium text-purple-800">Dina kurser</h3>
            <p className="text-purple-600 mt-2">Du har inga pågående kurser.</p>
            <div className="mt-4">
              <a
                href="/kurser"
                className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
              >
                Utforska kurser
              </a>
            </div>
          </div>
        </div>
      )}

      {role === 'teacher' && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-xl font-medium text-green-800">Dina kurser</h3>
          <p className="text-green-600 mt-2">Du har inga kurser att undervisa.</p>
          <div className="mt-4">
            <a
              href="/admin/kurser"
              className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Hantera kurser
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoleBasedContent
