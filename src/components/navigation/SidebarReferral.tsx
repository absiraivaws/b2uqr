"use client"

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'

export default function SidebarReferral() {
  const { toast } = useToast()
  const [uid, setUid] = useState<string | null>(null)
  const [points, setPoints] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUid(null)
        setLoading(false)
        return
      }
      setUid(user.uid)
      try {
        const ref = doc(db, 'users', user.uid)
        const snap = await getDoc(ref)
        if (snap && snap.exists()) {
          const data = snap.data() as any
          setPoints(Number(data.referralPoints || 0))
        } else {
          setPoints(0)
        }
      } catch (err: any) {
        const msg = String(err?.message || err)
        if (err?.code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
          // silently handle permission issues; user can still copy link
          setPoints(null)
        } else {
          console.error('Failed to load sidebar referral data', err)
          toast({ title: 'Load failed', description: 'Unable to load referral data' })
        }
      } finally {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [toast])

  const copyLink = async () => {
    if (!uid) return toast({ title: 'Not signed in', description: 'Sign in to get your referral link' })
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_ORIGIN || '')
      const link = `${origin}/signup?ref=${encodeURIComponent(uid)}`
      await navigator.clipboard.writeText(link)
      toast({ title: 'Copied', description: 'Referral link copied to clipboard' })
    } catch (e) {
      console.error('Copy failed', e)
      toast({ title: 'Copy failed', description: 'Unable to copy link' })
    }
  }

  return (
    <div className="flex flex-col gap-4 items-center justify-center pb-4">
      <div
        className="font-medium inline-block text-2xl"
        style={{
          background: 'linear-gradient(90deg,#7c3aed,#06b6d4,#f43f5e)',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          animation: 'gradientShift 3s linear infinite',
          textShadow: '0 0 10px rgba(124,58,237,0.55), 0 0 22px rgba(6,182,212,0.18)'
        }}>
          <span className='text-3xl font-bold'>{loading ? '—' : points === null ? '—' : points}</span> {' '} Points

          <style>{`@keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
      </div>
      <div className="shrink-0 group-data-[collapsible=icon]:hidden">
        <style>{`
          .neon-referral-btn{ transition: background .25s ease, color .25s ease, box-shadow .25s ease, border-color .25s ease; }
          .neon-referral-btn:hover{
            background: transparent !important;
            box-shadow: none !important;
            color: transparent !important;
            background-image: linear-gradient(90deg,#7c3aed,#06b6d4,#f43f5e) !important;
            background-size:200% 100% !important;
            -webkit-background-clip: text !important;
            background-clip: text !important;
            text-shadow: 0 0 8px rgba(124,58,237,0.55), 0 0 14px rgba(6,182,212,0.12);
            border-color: rgba(124,58,237,0.9) !important;
          }
          @keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        `}</style>

        <Button
          size="lg"
          onClick={copyLink}
          disabled={!uid}
          aria-label="Copy referral link"
          style={{
            background: 'linear-gradient(90deg,#7c3aed,#06b6d4,#f43f5e)',
            backgroundSize: '200% 100%',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 0 10px rgba(124,58,237,0.45), 0 0 22px rgba(6,182,212,0.12)',
            animation: 'gradientShift 3s linear infinite',
          }}
          className="neon-referral-btn !px-3 !py-1"
        >
          {uid ? 'Copy referral link' : 'Sign in to share'}
        </Button>
      </div>
    </div>
  )
}
