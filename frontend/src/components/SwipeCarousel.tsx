import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselItem {
    key: string | number;
    content: ReactNode;
}

interface Props {
    items: CarouselItem[];
    ariaLabel?: string;
}

/**
 * Carrusel horizontal con scroll-snap: 1 tarjeta visible en móvil, 2 en
 * tablet y 3 en PC. Flechas en desktop, swipe natural en móvil, y puntos
 * de posición.
 */
export default function SwipeCarousel({ items, ariaLabel }: Props) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [index, setIndex] = useState(0);
    const [perView, setPerView] = useState(1);

    useEffect(() => {
        const compute = () => {
            const w = window.innerWidth;
            setPerView(w >= 1024 ? 3 : w >= 640 ? 2 : 1);
        };
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, []);

    const pages = Math.max(1, items.length - perView + 1);
    const active = Math.max(0, Math.min(index, pages - 1));
    const scrollable = items.length > perView;

    const scrollToIndex = (i: number) => {
        const track = trackRef.current;
        if (!track || track.children.length === 0) return;
        const target = Math.max(0, Math.min(i, pages - 1));
        const child = track.children[target] as HTMLElement;
        track.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
        setIndex(target);
    };

    const handleScroll = () => {
        const track = trackRef.current;
        if (!track || track.children.length === 0) return;
        const child = track.children[0] as HTMLElement;
        const step = child.offsetWidth + 16; // gap-4 entre slides
        setIndex(Math.round(track.scrollLeft / step));
    };

    if (items.length === 0) return null;

    return (
        <div className="relative" aria-label={ariaLabel}>
            <div
                ref={trackRef}
                onScroll={handleScroll}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth hide-scrollbar pb-1"
            >
                {items.map((item) => (
                    <div
                        key={item.key}
                        className="snap-start shrink-0 w-[86%] sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]"
                    >
                        {item.content}
                    </div>
                ))}
            </div>

            {scrollable && (
                <>
                    <button
                        onClick={() => scrollToIndex(active - 1)}
                        disabled={active <= 0}
                        aria-label="Anterior"
                        className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 size-9 items-center justify-center rounded-full bg-white shadow-md border border-border-subtle text-slate-600 hover:text-primary hover:shadow-lg transition disabled:opacity-0 disabled:pointer-events-none z-10"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => scrollToIndex(active + 1)}
                        disabled={active >= pages - 1}
                        aria-label="Siguiente"
                        className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 size-9 items-center justify-center rounded-full bg-white shadow-md border border-border-subtle text-slate-600 hover:text-primary hover:shadow-lg transition disabled:opacity-0 disabled:pointer-events-none z-10"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>

                    {pages > 1 && (
                        <div className="flex items-center justify-center gap-1.5 mt-3">
                            {Array.from({ length: pages }, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => scrollToIndex(i)}
                                    aria-label={`Ir a la posición ${i + 1}`}
                                    className={`h-1.5 rounded-full transition-all ${
                                        i === active ? 'w-5 bg-primary' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
