import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from './supabase';
import { Role } from './types';

interface AuthState {
  session: Session | null;
  userId: string | null;
  role: Role;
  demo: boolean;
  loading: boolean;
  configured: boolean;
  displayName: string;
  avatarUrl: string | null;
  active: boolean;
  isTeam: boolean;
  isLeader: boolean;
  viewAs: 'team' | 'patient';
  setViewAs: (v: 'team' | 'patient') => void;
  teamLens: 'all' | Role;
  setTeamLens: (v: 'all' | Role) => void;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string, cpf?: string) => Promise<{ error?: string }>;
  enterDemo: (role?: Role) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const teamRoles: Role[] = ['medico', 'nutricionista', 'psicologa', 'educador_fisico', 'lider'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>('paciente');
  const [demo, setDemo] = useState(false);
  const [displayName, setDisplayName] = useState('Paciente');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewAs, setViewAs] = useState<'team' | 'patient'>('team');
  const [teamLens, setTeamLens] = useState<'all' | Role>('all');

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) loadProfile(s.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, role, avatar_url, active')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      setRole((data.role as Role) ?? 'paciente');
      setDisplayName(data.full_name || 'Paciente');
      setAvatarUrl((data as any).avatar_url ?? null);
      setActive(!!(data as any).active);
    }
  }

  async function refreshProfile() {
    if (session?.user) await loadProfile(session.user.id);
  }

  const value = useMemo<AuthState>(() => {
    const teamUser = teamRoles.includes(role);
    const preview = teamUser && viewAs === 'patient'; // profissional usando o PRÓPRIO espaço de paciente
    return {
      session,
      userId: session?.user?.id ?? (demo ? 'demo' : null),
      role,
      // No preview NÃO forçamos modo demonstração: o profissional usa seus dados reais
      // (o próprio espaço de paciente), igual a qualquer outro paciente.
      demo,
      loading,
      configured: supabaseConfigured,
      displayName,
      avatarUrl,
      active: demo ? true : preview ? true : active,
      isTeam: teamUser,
      isLeader: role === 'lider',
      viewAs,
      setViewAs,
      teamLens,
      setTeamLens,
      refreshProfile,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message };
      },
      async signUp(email, password, fullName, cpf) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, cpf: cpf || '' } },
        });
        if (error) return { error: error.message };
        // O perfil (com cpf) é criado pelo gatilho handle_new_user.
        return {};
      },
      enterDemo(demoRole: Role = 'paciente') {
        setDemo(true);
        setRole(demoRole);
        setDisplayName(
          demoRole === 'paciente'
            ? 'Ana Silva'
            : demoRole === 'medico'
              ? 'Dr. Tenner Nunes'
              : demoRole === 'nutricionista'
                ? 'Dra. Carla Nutri'
                : demoRole === 'psicologa'
                  ? 'Dra. Marina Psi'
                  : 'Prof. Rafael'
        );
      },
      async signOut() {
        setDemo(false);
        setRole('paciente');
        setActive(false);
        setAvatarUrl(null);
        setViewAs('team');
        setTeamLens('all');
        if (supabaseConfigured) await supabase.auth.signOut();
        setSession(null);
      },
    };
  }, [session, role, demo, loading, displayName, avatarUrl, active, viewAs, teamLens]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
