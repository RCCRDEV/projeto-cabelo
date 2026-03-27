'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { services, barbers, paymentMethods, products, Service, Barber, PaymentMethodId } from '@/config';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type AvailabilityOption = {
  dateTime: string;
  barber: Barber;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

type DemoBarber = Barber & {
  photoUrl: string;
};

const DEMO_STORAGE_KEY = 'confrade_demo_bookings_v1';

function isDemoBarber(barber: Barber): barber is DemoBarber {
  const maybe = barber as Barber & { photoUrl?: unknown };
  return typeof maybe.photoUrl === 'string';
}

function generateDaySlots(date: Date, durationMinutes: number) {
  const day = new Date(date);
  const start = new Date(day);
  start.setHours(9, 0, 0, 0);
  const end = new Date(day);
  end.setHours(19, 0, 0, 0);

  const slots: string[] = [];
  const stepMinutes = 30;

  const cursor = new Date(start);
  while (cursor.getTime() + durationMinutes * 60_000 <= end.getTime()) {
    slots.push(cursor.toISOString());
    cursor.setTime(cursor.getTime() + stepMinutes * 60_000);
  }

  return slots;
}

export default function Home() {
  const instagramUrl = 'https://www.instagram.com/confrade.barbearia/';
  const demoBarbers: DemoBarber[] = useMemo(
    () => [
      {
        id: 'ramon',
        name: 'Ramon',
        calendarId: 'demo-ramon',
        avatar: 'R',
        photoUrl:
          'https://images.unsplash.com/photo-1599351431613-18ef1fdd27e1?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'robinho',
        name: 'Robinho',
        calendarId: 'demo-robinho',
        avatar: 'R',
        photoUrl:
          'https://images.unsplash.com/photo-1582893561942-d61adcb2e534?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'wictor',
        name: 'Wictor',
        calendarId: 'demo-wictor',
        avatar: 'W',
        photoUrl:
          'https://images.unsplash.com/photo-1520975859018-0f82aabd5aeb?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'marlon',
        name: 'Marlon',
        calendarId: 'demo-marlon',
        avatar: 'M',
        photoUrl:
          'https://images.unsplash.com/photo-1520975958225-0d5db6a83d0a?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    []
  );

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [barberMode, setBarberMode] = useState<'any' | 'specific'>('any');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableOptions, setAvailableOptions] = useState<AvailabilityOption[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [saveCustomerData, setSaveCustomerData] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('pix');
  const [loading, setLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [demoMode, setDemoMode] = useState(true);
  const [demoBookedByBarberId, setDemoBookedByBarberId] = useState<Record<string, string[]>>({});
  const [activeSection, setActiveSection] = useState<'agendar' | 'servicos' | 'produtos' | 'barbeiros' | 'sobre'>('agendar');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);
  const [showDemoControls, setShowDemoControls] = useState(false);

  // Próximos 7 dias para escolha
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  const activeBarbers = useMemo(() => barbers.filter((b) => Boolean(b.calendarId)), []);
  const displayedBarbers = useMemo(() => (demoMode ? demoBarbers : activeBarbers), [activeBarbers, demoBarbers, demoMode]);

  useEffect(() => {
    if (activeBarbers.length > 0) {
      setDemoMode(false);
    }
  }, [activeBarbers.length]);

  useEffect(() => {
    if (!demoMode) return;
    try {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!isRecord(parsed)) return;

      const next: Record<string, string[]> = {};
      for (const [barberId, slots] of Object.entries(parsed)) {
        if (!Array.isArray(slots)) continue;
        next[barberId] = slots.filter((s) => typeof s === 'string');
      }
      setDemoBookedByBarberId(next);
    } catch {
      return;
    }
  }, [demoMode]);

  useEffect(() => {
    if (!demoMode) return;
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoBookedByBarberId));
    } catch {
      return;
    }
  }, [demoBookedByBarberId, demoMode]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const next = scrollable > 0 ? window.scrollY / scrollable : 0;
      setScrollProgress(Math.max(0, Math.min(1, next)));
      setShowFloatingCTA(window.scrollY > 500);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const ids: Array<'agendar' | 'servicos' | 'produtos' | 'barbeiros' | 'sobre'> = [
      'agendar',
      'servicos',
      'produtos',
      'barbeiros',
      'sobre',
    ];

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
        const id = visible?.target?.id;
        if (id === 'agendar' || id === 'servicos' || id === 'produtos' || id === 'barbeiros' || id === 'sobre') {
          setActiveSection(id);
        }
      },
      { root: null, threshold: [0.2, 0.35, 0.5, 0.65] }
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fetchAvailability = useCallback(async () => {
    if (!selectedService) return;
    setLoading(true);
    setAvailabilityError(null);
    try {
      if (demoMode) {
        const baseSlots = generateDaySlots(selectedDate, selectedService.duration);
        const isBooked = (barberId: string, dateTime: string) => {
          const booked = demoBookedByBarberId[barberId] || [];
          return booked.includes(dateTime);
        };

        const options: AvailabilityOption[] = [];
        if (barberMode === 'any') {
          for (const barber of demoBarbers) {
            for (const dateTime of baseSlots) {
              if (isBooked(barber.id, dateTime)) continue;
              options.push({ dateTime, barber });
            }
          }
          options.sort((a, b) => {
            const diff = new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
            if (diff !== 0) return diff;
            return a.barber.name.localeCompare(b.barber.name);
          });
          setAvailableOptions(options);
          return;
        }

        if (!selectedBarber) {
          setAvailableOptions([]);
          return;
        }

        const barber = selectedBarber;
        for (const dateTime of baseSlots) {
          if (isBooked(barber.id, dateTime)) continue;
          options.push({ dateTime, barber });
        }

        setAvailableOptions(options);
        return;
      }

      const dateParam = format(selectedDate, 'yyyy-MM-dd');

      const response =
        barberMode === 'any'
          ? await fetch(`/api/availability?any=1&date=${dateParam}&duration=${selectedService.duration}`)
          : await fetch(
              `/api/availability?calendarId=${selectedBarber?.calendarId}&date=${dateParam}&duration=${selectedService.duration}`
            );
      const data = await response.json();

      if (barberMode === 'any') {
        const options: unknown[] = Array.isArray(data.options) ? data.options : [];
        const mapped = options
          .map((o: unknown) => {
            if (!isRecord(o)) return null;
            const barberId = typeof o.barberId === 'string' ? o.barberId : null;
            const dateTime = typeof o.dateTime === 'string' ? o.dateTime : null;
            if (!barberId || !dateTime) return null;

            const barber = activeBarbers.find((b) => b.id === barberId);
            if (!barber?.calendarId) return null;
            return { dateTime, barber };
          })
          .filter(Boolean) as AvailabilityOption[];

        setAvailableOptions(mapped);
        return;
      }

      const slots: unknown[] = Array.isArray(data.slots) ? data.slots : [];
      const mapped = slots
        .filter((s: unknown): s is string => typeof s === 'string')
        .map((s: string) => {
          if (!selectedBarber) return null;
          return { dateTime: s, barber: selectedBarber };
        })
        .filter(Boolean) as AvailabilityOption[];

      setAvailableOptions(mapped);
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      setAvailabilityError('Não foi possível carregar os horários. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [activeBarbers, barberMode, demoBarbers, demoBookedByBarberId, demoMode, selectedBarber, selectedDate, selectedService]);

  useEffect(() => {
    if (step === 3 && selectedService && selectedDate && (barberMode === 'any' || selectedBarber)) {
      fetchAvailability();
    }
  }, [selectedBarber, selectedDate, selectedService, barberMode, step, fetchAvailability]);

  useEffect(() => {
    if (step !== 3) return;
    setSelectedSlot(null);
    if (barberMode === 'any') {
      setSelectedBarber(null);
    }
  }, [selectedDate, barberMode, step]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('barbershop_customer_v1');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.name === 'string') setCustomerName(parsed.name);
      if (typeof parsed?.phone === 'string') setCustomerPhone(parsed.phone);
      if (typeof parsed?.email === 'string') setCustomerEmail(parsed.email);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    try {
      if (!saveCustomerData) {
        localStorage.removeItem('barbershop_customer_v1');
        return;
      }
      localStorage.setItem(
        'barbershop_customer_v1',
        JSON.stringify({ name: customerName, phone: customerPhone, email: customerEmail })
      );
    } catch {
      return;
    }
  }, [saveCustomerData, customerName, customerPhone, customerEmail]);

  const handleBooking = async () => {
    if (!selectedBarber || !selectedService || !selectedSlot || !customerName || !customerPhone || !paymentMethod) return;
    setBookingStatus('loading');
    try {
      if (demoMode) {
        setDemoBookedByBarberId((prev) => {
          const existing = prev[selectedBarber.id] || [];
          if (existing.includes(selectedSlot)) return prev;
          return { ...prev, [selectedBarber.id]: [...existing, selectedSlot] };
        });
        setAvailableOptions((prev) =>
          prev.filter((o) => !(o.dateTime === selectedSlot && o.barber.id === selectedBarber.id))
        );
        setBookingStatus('success');
        return;
      }

      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barber: selectedBarber,
          service: selectedService,
          customer: { name: customerName, phone: customerPhone, email: customerEmail },
          date: selectedSlot,
          paymentMethod,
        }),
      });

      if (response.ok) {
        setBookingStatus('success');
      } else {
        setBookingStatus('error');
      }
    } catch {
      setBookingStatus('error');
    }
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => {
    setBookingStatus('idle');
    setStep(s => s - 1);
  };

  const resetFlow = () => {
    setBookingStatus('idle');
    setStep(1);
    setSelectedService(null);
    setSelectedBarber(null);
    setBarberMode('any');
    setSelectedDate(new Date());
    setAvailableOptions([]);
    setSelectedSlot(null);
  };

  if (bookingStatus === 'success') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
        <div className="bg-neutral-900/70 backdrop-blur p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-neutral-800">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Agendamento Realizado!</h1>
          <p className="text-neutral-400 mb-6">
            Seu horário para {selectedService?.name} com {selectedBarber?.name} foi confirmado e adicionado à agenda.
          </p>
          <p className="text-neutral-400 mb-6">
            Forma de pagamento: {paymentMethods.find((p) => p.id === paymentMethod)?.name}
          </p>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="block text-sm text-neutral-300 hover:text-white transition mb-6"
          >
            Siga a Confrade no Instagram
          </a>
          <button
            onClick={resetFlow}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
          >
            Novo Agendamento
          </button>
          {demoMode && (
            <div className="text-xs text-neutral-400 mt-4">
              Simulação ativa: o horário que você marcou some da lista.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-4 md:p-8">
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-neutral-900 z-50">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-400"
          style={{ width: `${Math.round(scrollProgress * 100)}%` }}
        />
      </div>
      <div className="max-w-4xl mx-auto">
        <header className="sticky top-0 z-40 -mx-4 md:-mx-8 px-4 md:px-8 py-4 backdrop-blur bg-neutral-950/70 border-b border-neutral-800">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600/35 via-violet-600/25 to-emerald-500/20 border border-neutral-800 flex items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-black tracking-tight truncate">Confrade Barbearia</h1>
                <div className="text-xs text-neutral-400 truncate">Agendamento • Barba • Cortes • Produtos</div>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-2 text-sm">
              {(
                [
                  ['agendar', 'Agendar'],
                  ['servicos', 'Serviços'],
                  ['produtos', 'Produtos'],
                  ['barbeiros', 'Barbeiros'],
                  ['sobre', 'Sobre'],
                ] as const
              ).map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className={`px-3 py-2 rounded-lg border transition ${
                    activeSection === id
                      ? 'bg-blue-600/15 border-blue-600/30 text-white'
                      : 'bg-neutral-950/20 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  {label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex px-4 py-2 rounded-lg bg-neutral-950/20 hover:bg-neutral-900 border border-neutral-800 transition text-sm"
              >
                Instagram
              </a>
              <a
                href="#agendar"
                className="inline-flex px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition font-bold text-sm"
              >
                Agendar
              </a>
            </div>
          </div>
        </header>

        <section className="mb-12 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl border border-neutral-800 overflow-hidden relative">
            <Image
              src="https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1600&q=80"
              alt="Barbearia"
              fill
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover opacity-35"
              priority
            />
            <div className="relative p-6 md:p-8 bg-gradient-to-tr from-neutral-950/90 via-neutral-950/65 to-neutral-950/25">
              <h2 className="text-2xl md:text-3xl font-black mb-2">Corte, barba e estilo — do jeito Confrade.</h2>
              <p className="text-neutral-200 leading-relaxed max-w-xl">
                Agende em poucos cliques e veja os barbeiros disponíveis com seus horários. Produtos e novidades você acompanha no
                Instagram.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#agendar"
                  className="inline-flex px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition font-bold"
                >
                  Ver horários agora
                </a>
                <a
                  href="#barbeiros"
                  className="inline-flex px-4 py-2 rounded-lg bg-neutral-900/60 hover:bg-neutral-900/80 border border-neutral-700 transition"
                >
                  Conhecer barbeiros
                </a>
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex px-4 py-2 rounded-lg bg-neutral-900/60 hover:bg-neutral-900/80 border border-neutral-700 transition"
                >
                  Instagram
                </a>
              </div>
            </div>
          </div>
          <div className="bg-neutral-900/60 backdrop-blur rounded-2xl p-6 border border-neutral-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-neutral-400 mb-2">Atendimento</div>
                <div className="text-2xl font-bold">09:00 – 19:00</div>
                <div className="text-neutral-400 mt-2 text-sm">Horários variam conforme disponibilidade.</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setShowDemoControls((v) => !v)}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition"
              >
                Protótipo
              </button>
              {demoMode && (
                <div className="text-[11px] text-neutral-500">
                  Demo ativa
                </div>
              )}
            </div>

            {showDemoControls && (
              <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-neutral-300 truncate">Controles de demo</div>
                    <div className="text-[11px] text-neutral-500 truncate">Ramon • Robinho • Wictor • Marlon</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {demoMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setDemoBookedByBarberId({});
                          try {
                            localStorage.removeItem(DEMO_STORAGE_KEY);
                          } catch {
                            return;
                          }
                        }}
                        className="px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 transition text-xs text-neutral-300"
                      >
                        Limpar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setDemoMode((v) => !v);
                        setStep(1);
                        setSelectedService(null);
                        setSelectedBarber(null);
                        setBarberMode('any');
                        setAvailableOptions([]);
                        setSelectedSlot(null);
                        setBookingStatus('idle');
                        setAvailabilityError(null);
                      }}
                      className={`px-3 py-2 rounded-lg border transition text-xs ${
                        demoMode
                          ? 'bg-blue-600/15 border-blue-600/30 text-neutral-100 hover:bg-blue-600/25'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      {demoMode ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-neutral-500 mt-3 leading-relaxed">
                  {demoMode
                    ? 'Ao confirmar um horário, ele some da lista (salvo no navegador).'
                    : 'Desative para usar a disponibilidade real (Google Agenda).'}
                </div>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <a href="#servicos" className="rounded-lg bg-neutral-950/30 border border-neutral-800 px-3 py-2 hover:bg-neutral-900">
                Serviços
              </a>
              <a href="#barbeiros" className="rounded-lg bg-neutral-950/30 border border-neutral-800 px-3 py-2 hover:bg-neutral-900">
                Barbeiros
              </a>
              <a href="#produtos" className="rounded-lg bg-neutral-950/30 border border-neutral-800 px-3 py-2 hover:bg-neutral-900">
                Produtos
              </a>
              <a href="#agendar" className="rounded-lg bg-neutral-950/30 border border-neutral-800 px-3 py-2 hover:bg-neutral-900">
                Agendar
              </a>
            </div>
          </div>
        </section>

        {/* Barra de Progresso */}
        <section id="agendar" className="bg-neutral-950/30 border border-neutral-800 rounded-2xl p-4 md:p-6 mb-16">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">Agendar Horário</h2>
              <p className="text-neutral-400 text-sm">Escolha serviço, barbeiro, data e forma de pagamento.</p>
            </div>
            <div className="text-xs text-neutral-500">Passo {step}/4</div>
          </div>

          <div className="mb-8 flex justify-between items-center px-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 mx-1 rounded-full transition-colors ${
                  step >= i ? 'bg-blue-600' : 'bg-neutral-700'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Serviço */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xl font-bold mb-6">Selecione o Serviço</h3>
              <div className="grid gap-4">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => {
                      setSelectedService(service);
                      nextStep();
                    }}
                    className={`flex justify-between items-center p-6 rounded-xl border-2 transition ${
                      selectedService?.id === service.id
                        ? 'border-blue-600 bg-blue-600/10'
                        : 'border-neutral-800 bg-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-left">
                      <h4 className="font-bold text-lg">{service.name}</h4>
                      <p className="text-sm text-neutral-400">{service.duration} min</p>
                      {service.description && (
                        <p className="text-xs text-neutral-500 mt-1 max-w-xs">{service.description}</p>
                      )}
                    </div>
                    <div className="text-xl font-bold">R$ {service.price.toFixed(2).replace('.', ',')}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Barbeiro */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xl font-bold mb-6">Escolha o Profissional</h3>
              <div className="grid gap-4">
                <button
                  onClick={() => {
                    setBarberMode('any');
                    setSelectedBarber(null);
                    nextStep();
                  }}
                  className={`flex items-center gap-4 p-6 rounded-xl border-2 transition ${
                    barberMode === 'any'
                      ? 'border-blue-600 bg-blue-600/10'
                      : 'border-neutral-800 bg-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="w-12 h-12 bg-neutral-700 rounded-full flex items-center justify-center font-bold text-xl">
                    ★
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-lg">Sem preferência</h4>
                    <p className="text-sm text-neutral-400">Mostra todos os horários disponíveis</p>
                  </div>
                </button>
                {displayedBarbers.map((barber) => (
                  <button
                    key={barber.id}
                    onClick={() => {
                      setBarberMode('specific');
                      setSelectedBarber(barber);
                      nextStep();
                    }}
                    className={`flex items-center gap-4 p-6 rounded-xl border-2 transition ${
                      barberMode === 'specific' && selectedBarber?.id === barber.id
                        ? 'border-blue-600 bg-blue-600/10'
                        : 'border-neutral-800 bg-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {isDemoBarber(barber) ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-neutral-700">
                        <Image src={barber.photoUrl} alt={barber.name} width={48} height={48} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-neutral-700 rounded-full flex items-center justify-center font-bold text-xl">
                        {barber.name[0]}
                      </div>
                    )}
                    <div className="text-left">
                      <h4 className="font-bold text-lg">{barber.name}</h4>
                      <p className="text-sm text-neutral-400">{demoMode ? 'Simulação de horários' : 'Agendamento online disponível'}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={prevStep}
                className="mt-6 text-neutral-400 hover:text-white transition flex items-center gap-2"
              >
                ← Voltar para serviços
              </button>
            </div>
          )}

          {/* Step 3: Data e Hora */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xl font-bold mb-6">Data e Horário</h3>

              {demoMode && (
                <div className="rounded-xl border border-blue-600/30 bg-blue-600/10 p-4 text-sm text-neutral-200">
                  Mini simulação ativa: ao confirmar o horário, ele sai da lista.
                </div>
              )}

              {availabilityError && (
                <div className="rounded-xl border border-red-600/30 bg-red-600/10 p-4 text-sm text-neutral-200 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-bold">Falha ao carregar</div>
                    <div className="text-xs text-neutral-300">{availabilityError}</div>
                  </div>
                  <button
                    type="button"
                    onClick={fetchAvailability}
                    className="px-3 py-2 rounded-lg border border-red-600/30 bg-red-600/10 hover:bg-red-600/20 transition text-sm font-bold whitespace-nowrap"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
            
              {/* Seletor de Data */}
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {days.map((date) => (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={`flex-shrink-0 w-20 p-3 rounded-xl border-2 text-center transition ${
                      format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-neutral-800 bg-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-xs uppercase font-bold opacity-70">
                      {format(date, 'EEE', { locale: ptBR })}
                    </div>
                    <div className="text-lg font-bold">{format(date, 'dd')}</div>
                  </button>
                ))}
              </div>

            {/* Seletor de Hora */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {loading ? (
                <>
                  {Array.from({ length: 12 }, (_, i) => (
                    <div
                      key={i}
                      className="h-14 rounded-xl border border-neutral-800 bg-neutral-900/40 animate-pulse"
                    />
                  ))}
                </>
              ) : availableOptions.length > 0 ? (
                availableOptions.map((opt) => (
                  <button
                    key={`${opt.dateTime}-${opt.barber.id}`}
                    onClick={() => {
                      setSelectedSlot(opt.dateTime);
                      setSelectedBarber(opt.barber);
                      nextStep();
                    }}
                    className={`p-3 rounded-lg border-2 text-center transition ${
                      selectedSlot === opt.dateTime && selectedBarber?.id === opt.barber.id
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-neutral-800 bg-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="font-bold">{format(new Date(opt.dateTime), 'HH:mm')}</div>
                    {barberMode === 'any' && <div className="text-[10px] opacity-70">{opt.barber.name}</div>}
                  </button>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-neutral-500">
                  Nenhum horário disponível para este dia.
                </div>
              )}
            </div>

              <button
                onClick={prevStep}
                className="mt-6 text-neutral-400 hover:text-white transition flex items-center gap-2"
              >
                ← Voltar para barbeiros
              </button>
            </div>
          )}

          {/* Step 4: Confirmação */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xl font-bold mb-6">Seus Dados</h3>
            
            <div className="bg-neutral-800 p-6 rounded-xl mb-8 space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-400">Serviço:</span>
                <span className="font-bold">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Barbeiro:</span>
                <span className="font-bold">{selectedBarber?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Data:</span>
                <span className="font-bold">
                  {selectedSlot && format(new Date(selectedSlot), "dd 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Horário:</span>
                <span className="font-bold">
                  {selectedSlot && format(new Date(selectedSlot), 'HH:mm')}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">Seu Nome</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full bg-neutral-800 border-2 border-neutral-700 rounded-xl p-4 focus:border-blue-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">Seu WhatsApp</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Ex: (27) 99999-9999"
                  className="w-full bg-neutral-800 border-2 border-neutral-700 rounded-xl p-4 focus:border-blue-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">Seu Email (opcional)</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Ex: voce@email.com"
                  className="w-full bg-neutral-800 border-2 border-neutral-700 rounded-xl p-4 focus:border-blue-600 outline-none transition"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input
                  id="saveCustomerData"
                  type="checkbox"
                  checked={saveCustomerData}
                  onChange={(e) => setSaveCustomerData(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="saveCustomerData" className="text-sm text-neutral-400">
                  Salvar meus dados para a próxima vez
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-neutral-400">Forma de Pagamento</label>
              <div className="grid gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      paymentMethod === method.id
                        ? 'border-blue-600 bg-blue-600/10'
                        : 'border-neutral-800 bg-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="font-bold">{method.name}</div>
                    {method.description && <div className="text-xs text-neutral-500 mt-1">{method.description}</div>}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleBooking}
              disabled={!customerName || !customerPhone || !paymentMethod || bookingStatus === 'loading'}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition mt-8 text-lg"
            >
              {bookingStatus === 'loading' ? 'Confirmando...' : 'Confirmar Agendamento'}
            </button>

            {bookingStatus === 'error' && (
              <div className="rounded-xl border border-red-600/30 bg-red-600/10 p-4 text-sm text-neutral-200">
                <div className="font-bold">Não foi possível confirmar</div>
                <div className="text-xs text-neutral-300 mt-1">
                  Verifique seus dados e tente novamente. Se estiver usando agenda real, confira também a conexão.
                </div>
              </div>
            )}

              <button
                onClick={prevStep}
                className="w-full text-neutral-400 hover:text-white transition py-2"
              >
                Alterar horário
              </button>
            </div>
          )}
        </section>

        <section id="servicos" className="mb-16">
          <h2 className="text-2xl font-bold mb-2">Serviços</h2>
          <p className="text-neutral-400 mb-6">
            Selecione o serviço e finalize seu agendamento. Outros serviços e combinações podem estar disponíveis sob consulta.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((service) => (
              <div key={service.id} className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-bold text-lg">{service.name}</div>
                    <div className="text-sm text-neutral-400">{service.duration} min</div>
                    {service.description && <div className="text-sm text-neutral-300 mt-2">{service.description}</div>}
                  </div>
                  <div className="font-bold whitespace-nowrap">R$ {service.price.toFixed(2).replace('.', ',')}</div>
                </div>
                <div className="mt-4">
                  <a
                    href="#agendar"
                    className="inline-flex px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 transition text-sm"
                  >
                    Agendar este serviço
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="produtos" className="mb-16">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Produtos em destaque</h2>
              <p className="text-neutral-400">Curadoria inspirada no nosso Instagram, disponível na barbearia.</p>
            </div>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition"
            >
              Ver no Instagram
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-neutral-900/60 backdrop-blur border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-700 transition"
              >
                <div className="relative h-28">
                  <Image
                    src={`https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80`}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover opacity-50"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/30 to-transparent" />
                  <div className="relative p-4 flex items-end justify-between gap-3 h-full">
                    <div className="font-bold">{product.name}</div>
                    {'category' in product && product.category ? (
                      <div className="text-xs px-2 py-1 rounded-full bg-neutral-950/60 border border-neutral-700 text-neutral-200">
                        {product.category}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="p-5">
                  {'description' in product && product.description ? (
                    <div className="text-sm text-neutral-300">{product.description}</div>
                  ) : null}
                  <div className="text-xs text-neutral-500 mt-4">Consulte disponibilidade e valores no balcão.</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="barbeiros" className="mb-16">
          <h2 className="text-2xl font-bold mb-2">Barbeiros</h2>
          <p className="text-neutral-400 mb-6">Escolha um profissional ou selecione “Sem preferência” para ver todos os horários.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {displayedBarbers.map((barber) => (
              <div
                key={barber.id}
                className="bg-neutral-900/60 backdrop-blur border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-700 transition"
              >
                {isDemoBarber(barber) ? (
                  <div className="relative h-28">
                    <Image src={barber.photoUrl} alt={barber.name} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/30 to-transparent" />
                    <div className="relative p-4 h-full flex items-end">
                      <div className="font-bold text-lg">{barber.name}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-neutral-700 rounded-full flex items-center justify-center font-bold text-xl">
                      {barber.name[0]}
                    </div>
                    <div className="font-bold text-lg">{barber.name}</div>
                  </div>
                )}
                <div className="p-5 pt-4">
                  <div className="text-sm text-neutral-400">
                    {demoMode ? 'Simulação de horários' : 'Disponível para agendamento online'}
                  </div>
                  <div className="mt-4">
                    <a
                      href="#agendar"
                      className="inline-flex px-4 py-2 rounded-lg bg-neutral-950/30 hover:bg-neutral-900 border border-neutral-800 transition text-sm"
                    >
                      Ver horários
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="sobre" className="mb-16">
          <h2 className="text-2xl font-bold mb-2">Sobre a Confrade</h2>
          <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6">
            <p className="text-neutral-300 leading-relaxed">
              A Confrade é um espaço pensado para quem valoriza estilo, técnica e atenção aos detalhes. Do corte à barba, a proposta
              é entregar uma experiência completa — com atendimento de verdade e aquele momento de pausa que faz diferença na rotina.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="#agendar"
                className="inline-flex px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition font-bold"
              >
                Agendar agora
              </a>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 transition"
              >
                Ver Instagram
              </a>
            </div>
          </div>
        </section>

        <footer className="mt-20 pt-8 border-t border-neutral-800 text-center text-sm text-neutral-500">
          <p>© {new Date().getFullYear()} Confrade Barbearia. Todos os direitos reservados.</p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <a href={instagramUrl} target="_blank" rel="noreferrer" className="hover:text-neutral-300">
              Instagram
            </a>
            <Link href="/admin" className="hover:text-neutral-300">
              Acesso Restrito
            </Link>
          </div>
        </footer>
      </div>
      {showFloatingCTA && (
        <div className="fixed bottom-5 right-5 z-40">
          <button
            type="button"
            onClick={() => document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 transition font-bold shadow-lg shadow-black/30 border border-blue-500/30"
          >
            Agendar
          </button>
        </div>
      )}
    </main>
  );
}
