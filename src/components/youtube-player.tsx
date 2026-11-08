import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function YoutubePlayer({ id, onClose }: { id: string; onClose: () => void }) {
  return <section className="mb-8 border-b border-border pb-6">
    <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">YouTube · Online</h2><Button variant="ghost" size="icon" aria-label="Fechar vídeo" onClick={onClose}><X /></Button></div>
    <iframe title="Vídeo do YouTube" className="aspect-video w-full max-w-3xl rounded-lg" src={`https://www.youtube-nocookie.com/embed/${id}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
  </section>;
}