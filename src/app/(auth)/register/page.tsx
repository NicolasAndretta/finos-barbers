import React from 'react'
import { AuthForm } from '@/components/ui/AuthForm'
import { registerAction } from './actions'

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center w-full">
      <AuthForm type="register" action={registerAction} />
    </div>
  )
}