import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserRound, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccount } from '@/components/account-provider';
import { supabase } from '@/integrations/supabase/client';
import { accountEmail } from '@/lib/account';

export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [{ title: 'Minha conta — RIAmp' }, { name: 'description', content: 'Crie sua conta RIAmp com nome de utilizador e senha.' }, { property: 'og:title', content: 'Minha conta — RIAmp' }, { property: 'og:description', content: 'Sua conta e suas preferências musicais no RIAmp.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading } = useAccount();
  const [signup, setSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [favoriteMusic, setFavoriteMusic] = useState('');
  const [avatar, setAvatar] = useState('🎵');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const client = useQueryClient();
  const fieldClass = 'block w-full rounded-md border border-border bg-card px-3 py-3 text-foreground';
  return <main className="mx-auto min-h-screen max-w-lg px-5 py-8 text-foreground">
    <Button variant="ghost" asChild><Link to="/"><ArrowLeft /> RIAmp</Link></Button>
    <div className="mt-10"><UserRound className="mb-4 h-10 w-10 text-primary" /><h1 className="font-display text-3xl font-bold">{user ? 'Minha conta' : signup ? 'Criar conta' : 'Entrar no RIAmp'}</h1></div>
    {loading ? <Loader2 className="mt-8 animate-spin" /> : user ? <div className="mt-8 space-y-5">
      <p className="font-semibold">{user.user_metadata['display_name'] || user.email?.split('@')[0]}</p>
      <Button variant="outline" disabled={busy} onClick={async () => {
        setBusy(true); setMessage('');
        const { data, error } = await supabase.from('profiles').select('display_name, avatar, favorite_music').eq('id', user.id).single();
        if (error) setMessage('Não foi possível carregar o perfil. Tente novamente.');
        else { setDisplayName(data.display_name); setAvatar(data.avatar); setFavoriteMusic(data.favorite_music); }
        setBusy(false);
      }}>Carregar perfil</Button>
      <form className="space-y-4" onSubmit={async e => {
        e.preventDefault(); setBusy(true); setMessage('');
        const { error } = await supabase.from('profiles').update({ display_name: displayName, avatar, favorite_music: favoriteMusic }).eq('id', user.id);
        setMessage(error ? 'Não foi possível salvar o perfil.' : 'Perfil salvo.'); setBusy(false);
      }}>
        <label className="block space-y-2">Nome<input required maxLength={80} aria-label="Nome do perfil" className={fieldClass} value={displayName} onChange={e => setDisplayName(e.target.value)} /></label>
        <label className="block space-y-2">Avatar<select className={fieldClass} aria-label="Avatar" value={avatar} onChange={e => setAvatar(e.target.value)}>{['🎵','🎧','🎸','🎹','💿','❤️'].map(a => <option key={a}>{a}</option>)}</select></label>
        <label className="block space-y-2">Preferências musicais<input maxLength={500} aria-label="Preferências musicais" className={fieldClass} value={favoriteMusic} onChange={e => setFavoriteMusic(e.target.value)} /></label>
        <Button disabled={busy} type="submit">Salvar perfil</Button>
      </form>
      <Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); await client.cancelQueries(); client.clear(); const { error } = await supabase.auth.signOut(); if (error) setMessage('Não foi possível sair.'); else await navigate({ to: '/auth', replace: true }); setBusy(false); }}><LogOut /> Sair</Button>
    </div> : <form className="mt-8 space-y-5" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setMessage('');
      try {
        const email = accountEmail(username);
        if (signup) {
          const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: window.location.origin } });
          if (error) throw error;
          if (!data.session) { setMessage('O cadastro sem e-mail ainda depende da ativação de confirmação automática nas configurações do RIAmp.'); return; }
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }
        setPassword(''); await navigate({ to: '/' });
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.'); }
      finally { setBusy(false); }
    }}>
      {signup && <label className="block space-y-2">Nome<input aria-label="Seu nome" required maxLength={80} className={fieldClass} value={displayName} onChange={e => setDisplayName(e.target.value)} /></label>}
      <label className="block space-y-2">Utilizador<input aria-label="Utilizador" autoComplete="username" required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]{3,30}" className={fieldClass} value={username} onChange={e => setUsername(e.target.value)} /></label>
      <label className="block space-y-2">Senha<input aria-label="Senha" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={8} className={fieldClass} value={password} onChange={e => setPassword(e.target.value)} /></label>
      <p className="text-sm text-muted-foreground">Sem e-mail, não é possível recuperar uma senha esquecida.</p>
      <Button className="w-full" disabled={busy} type="submit">{busy && <Loader2 className="animate-spin" />}{signup ? 'Criar conta' : 'Entrar'}</Button>
      <Button className="w-full" variant="ghost" type="button" onClick={() => { setSignup(!signup); setMessage(''); }}>{signup ? 'Já tenho conta' : 'Criar uma conta'}</Button>
    </form>}
    {message && <p role="status" className="mt-5 text-sm">{message}</p>}
  </main>;
}