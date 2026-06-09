import { AfterViewInit, Component, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.css']
})
export class CalendarComponent implements AfterViewInit {
  @ViewChild('eventContent', { static: true }) eventContent!: TemplateRef<any>;

  constructor(private http: HttpClient) {}

  loading = false;
  selectedFestival: any = null;

  apiUrl = 'http://localhost:5000/api/festival/analytics';

  fallbackTheme = {
    key: 'default',
    name: 'Festival',
    bgImage:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
    surface: 'linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.88))',
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.18)',
    accentStrong: '#0ea5e9',
    textGlow: 'rgba(56, 189, 248, 0.35)',
    chipBg: 'rgba(255,255,255,0.14)',
    chipBorder: 'rgba(255,255,255,0.18)',
    cardGlow: '0 10px 30px rgba(0,0,0,0.18)',
    insight:
      'Festival demand often changes buying behavior. Use this day to optimize stock, staffing, and combos.',
    mood: 'Seasonal intelligence',
    icon: '✨'
  };

  festivalThemes: Record<string, any> = {
    '🎆 Diwali': {
      key: 'diwali',
      name: 'Diwali',
      bgImage:
        'https://images.unsplash.com/photo-1604423477425-f6d9b9c3c1f5?auto=format&fit=crop&w=1600&q=80',
      surface: 'linear-gradient(135deg, rgba(88,28,135,0.88), rgba(234,88,12,0.80), rgba(251,191,36,0.70))',
      accent: '#fbbf24',
      accentSoft: 'rgba(251, 191, 36, 0.18)',
      accentStrong: '#f59e0b',
      textGlow: 'rgba(251, 191, 36, 0.45)',
      chipBg: 'rgba(255, 215, 0, 0.16)',
      chipBorder: 'rgba(255, 255, 255, 0.24)',
      cardGlow: '0 12px 34px rgba(245,158,11,0.18)',
      insight:
        'Diwali usually boosts group orders and celebration meals. Focus on high-volume dishes and festive combos.',
      mood: 'Celebration surge expected',
      icon: '🪔'
    },
    '🪔 Pongal': {
      key: 'pongal',
      name: 'Pongal',
      bgImage:
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80',
      surface: 'linear-gradient(135deg, rgba(21,128,61,0.88), rgba(202,138,4,0.78), rgba(251,146,60,0.70))',
      accent: '#84cc16',
      accentSoft: 'rgba(132, 204, 22, 0.18)',
      accentStrong: '#65a30d',
      textGlow: 'rgba(132, 204, 22, 0.35)',
      chipBg: 'rgba(163, 230, 53, 0.16)',
      chipBorder: 'rgba(255, 255, 255, 0.22)',
      cardGlow: '0 12px 34px rgba(132,204,22,0.16)',
      insight:
        'Pongal can shift demand toward hearty and traditional comfort foods. Promote family-sized servings and warm dishes.',
      mood: 'Harvest celebration demand',
      icon: '🌾'
    },
    '🇮🇳 Republic Day': {
      key: 'republic-day',
      name: 'Republic Day',
      bgImage:
        'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1600&q=80',
      surface: 'linear-gradient(135deg, rgba(234,88,12,0.82), rgba(255,255,255,0.18), rgba(22,163,74,0.78))',
      accent: '#fb923c',
      accentSoft: 'rgba(251, 146, 60, 0.16)',
      accentStrong: '#ea580c',
      textGlow: 'rgba(251, 146, 60, 0.32)',
      chipBg: 'rgba(255,255,255,0.12)',
      chipBorder: 'rgba(255,255,255,0.18)',
      cardGlow: '0 12px 34px rgba(234,88,12,0.14)',
      insight:
        'Republic Day traffic may rise during lunch and family outing hours. Keep service flow quick and menu prep balanced.',
      mood: 'Patriotic holiday traffic',
      icon: '🇮🇳'
    },
    '🌙 Ramzan': {
      key: 'ramzan',
      name: 'Ramzan',
      bgImage:
        'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1600&q=80',
      surface: 'linear-gradient(135deg, rgba(3,105,161,0.85), rgba(15,118,110,0.82), rgba(17,24,39,0.88))',
      accent: '#22d3ee',
      accentSoft: 'rgba(34, 211, 238, 0.18)',
      accentStrong: '#06b6d4',
      textGlow: 'rgba(34, 211, 238, 0.35)',
      chipBg: 'rgba(34,211,238,0.14)',
      chipBorder: 'rgba(255,255,255,0.20)',
      cardGlow: '0 12px 34px rgba(34,211,238,0.14)',
      insight:
        'Ramzan demand often peaks around evening meal times. Highlight combo packs and fast-moving dishes for break-fast ordering.',
      mood: 'Evening-heavy ordering pattern',
      icon: '🌙'
    },
    '🌸 Tamil New Year': {
      key: 'tamil-new-year',
      name: 'Tamil New Year',
      bgImage:
        'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1600&q=80',
      surface: 'linear-gradient(135deg, rgba(190,24,93,0.82), rgba(234,179,8,0.72), rgba(22,163,74,0.72))',
      accent: '#f472b6',
      accentSoft: 'rgba(244, 114, 182, 0.18)',
      accentStrong: '#db2777',
      textGlow: 'rgba(244, 114, 182, 0.34)',
      chipBg: 'rgba(244,114,182,0.15)',
      chipBorder: 'rgba(255,255,255,0.22)',
      cardGlow: '0 12px 34px rgba(244,114,182,0.14)',
      insight:
        'Tamil New Year can increase celebratory dining and family orders. Push premium meals and curated festive bundles.',
      mood: 'Family celebration demand',
      icon: '🌸'
    },
    '🐐 Bakrid': {
      key: 'bakrid',
      name: 'Bakrid',
      bgImage:
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1600&q=80',
      surface: 'linear-gradient(135deg, rgba(120,53,15,0.84), rgba(22,101,52,0.76), rgba(15,23,42,0.88))',
      accent: '#34d399',
      accentSoft: 'rgba(52, 211, 153, 0.18)',
      accentStrong: '#10b981',
      textGlow: 'rgba(52, 211, 153, 0.34)',
      chipBg: 'rgba(52,211,153,0.14)',
      chipBorder: 'rgba(255,255,255,0.20)',
      cardGlow: '0 12px 34px rgba(52,211,153,0.14)',
      insight:
        'Bakrid may drive high demand for rich and shareable dishes. Inventory for high-consumption items should be monitored closely.',
      mood: 'High-shareable-meal potential',
      icon: '🐐'
    },
    '🇮🇳 Independence Day': {
      key: 'independence-day',
      name: 'Independence Day',
      bgImage:
        'https://images.unsplash.com/photo-1470004914212-05527e49370b?auto=format&fit=crop&w=1600&q=80',
      surface: 'linear-gradient(135deg, rgba(249,115,22,0.84), rgba(255,255,255,0.18), rgba(34,197,94,0.78))',
      accent: '#22c55e',
      accentSoft: 'rgba(34, 197, 94, 0.18)',
      accentStrong: '#16a34a',
      textGlow: 'rgba(34, 197, 94, 0.30)',
      chipBg: 'rgba(255,255,255,0.12)',
      chipBorder: 'rgba(255,255,255,0.18)',
      cardGlow: '0 12px 34px rgba(34,197,94,0.12)',
      insight:
        'Independence Day may bring steady family and outing traffic. Keep popular dishes ready and reduce service delays during rush windows.',
      mood: 'Holiday outing demand',
      icon: '🎉'
    },
    '🐘 Ganesh Chaturthi': {
      key: 'ganesh',
      name: 'Ganesh Chaturthi',
      bgImage:
        'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1600&q=80',
      surface: 'linear-gradient(135deg, rgba(217,119,6,0.84), rgba(220,38,38,0.72), rgba(147,51,234,0.70))',
      accent: '#fb923c',
      accentSoft: 'rgba(251, 146, 60, 0.18)',
      accentStrong: '#f97316',
      textGlow: 'rgba(251, 146, 60, 0.35)',
      chipBg: 'rgba(251,146,60,0.15)',
      chipBorder: 'rgba(255,255,255,0.22)',
      cardGlow: '0 12px 34px rgba(251,146,60,0.14)',
      insight:
        'Ganesh Chaturthi can create demand spikes around celebration hours. Prioritize dishes with fast preparation and strong repeat demand.',
      mood: 'Peak-hour festive demand',
      icon: '🐘'
    },
    '🪔 Ayudha Pooja': {
      key: 'ayudha-pooja',
      name: 'Ayudha Pooja',
      bgImage:
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1600&q=80',
      surface: 'linear-gradient(135deg, rgba(180,83,9,0.82), rgba(168,85,247,0.72), rgba(14,116,144,0.76))',
      accent: '#f59e0b',
      accentSoft: 'rgba(245, 158, 11, 0.18)',
      accentStrong: '#d97706',
      textGlow: 'rgba(245, 158, 11, 0.35)',
      chipBg: 'rgba(245,158,11,0.14)',
      chipBorder: 'rgba(255,255,255,0.22)',
      cardGlow: '0 12px 34px rgba(245,158,11,0.14)',
      insight:
        'Ayudha Pooja can bring concentrated local demand. Keep menu availability stable and focus on operational smoothness.',
      mood: 'Localized festive traffic',
      icon: '🛕'
    },
    '🎄 Christmas': {
      key: 'christmas',
      name: 'Christmas',
      bgImage:
        'https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=1600&q=80',
      surface: 'linear-gradient(135deg, rgba(21,128,61,0.86), rgba(185,28,28,0.78), rgba(15,23,42,0.88))',
      accent: '#f87171',
      accentSoft: 'rgba(248, 113, 113, 0.18)',
      accentStrong: '#ef4444',
      textGlow: 'rgba(248, 113, 113, 0.35)',
      chipBg: 'rgba(255,255,255,0.12)',
      chipBorder: 'rgba(255,255,255,0.18)',
      cardGlow: '0 12px 34px rgba(248,113,113,0.14)',
      insight:
        'Christmas can raise dine-in and celebration meal demand. Promote bundles and prep extra inventory for top-performing dishes.',
      mood: 'Celebration dining demand',
      icon: '🎄'
    }
  };

  activeTheme = this.fallbackTheme;

  festivals = [
    {
      title: '🎆 Diwali',
      date: '2026-11-12',
      extendedProps: { type: 'major', tagline: 'Lights, family feasts, high celebration demand' }
    },
    {
      title: '🪔 Pongal',
      date: '2026-01-14',
      extendedProps: { type: 'major', tagline: 'Harvest mood and hearty meal demand' }
    },
    {
      title: '🇮🇳 Republic Day',
      date: '2026-01-26',
      extendedProps: { type: 'national', tagline: 'Holiday outing and lunch rush potential' }
    },
    {
      title: '🌙 Ramzan',
      date: '2026-03-21',
      extendedProps: { type: 'religious', tagline: 'Evening order peaks and combo potential' }
    },
    {
      title: '🌸 Tamil New Year',
      date: '2026-04-14',
      extendedProps: { type: 'major', tagline: 'Family celebration and premium meal potential' }
    },
    {
      title: '🐐 Bakrid',
      date: '2026-05-28',
      extendedProps: { type: 'religious', tagline: 'High shareable dish demand' }
    },
    {
      title: '🇮🇳 Independence Day',
      date: '2026-08-15',
      extendedProps: { type: 'national', tagline: 'Holiday traffic and family orders' }
    },
    {
      title: '🐘 Ganesh Chaturthi',
      date: '2026-09-05',
      extendedProps: { type: 'major', tagline: 'Festive peak-hour demand expected' }
    },
    {
      title: '🪔 Ayudha Pooja',
      date: '2026-10-20',
      extendedProps: { type: 'regional', tagline: 'Localized festive demand pattern' }
    },
    {
      title: '🎄 Christmas',
      date: '2026-12-25',
      extendedProps: { type: 'major', tagline: 'Celebration dining and bundle demand' }
    }
  ];

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    height: 'auto',
    fixedWeekCount: false,
    dayMaxEventRows: 2,
    eventClick: this.handleEventClick.bind(this),
    eventContent: undefined,
    events: this.festivals.map((festival) => ({
      ...festival,
      backgroundColor: this.getEventColor(festival.title),
      borderColor: this.getEventColor(festival.title),
      textColor: '#ffffff'
    }))
  };

  ngAfterViewInit(): void {
    this.calendarOptions = {
      ...this.calendarOptions,
      eventContent: this.eventContent
    };
  }

  handleEventClick(info: any) {
    this.loading = true;
    this.selectedFestival = null;

    const festivalDate = info.event.startStr || '';
    const festivalName = info.event.title || 'Festival';

    this.activeTheme = this.festivalThemes[festivalName] || this.fallbackTheme;

    this.http.get<any>(`${this.apiUrl}/${festivalDate}`).subscribe({
      next: (data) => {
        this.selectedFestival = {
          ...data,
          title: festivalName,
          date: festivalDate,
          recommendation: data.recommendation || this.getFestivalRecommendation(data.overallGrowthPercent || 0),
          crowdTag: data.crowdTag || this.getCrowdTag(data.overallGrowthPercent || 0),
          operationalAdvice:
            data.operationalAdvice?.length
              ? data.operationalAdvice
              : this.getOperationalAdvice(data.items || [], data.overallGrowthPercent || 0)
        };

        this.loading = false;
      },
      error: (err) => {
        console.error('Festival Analytics Error:', err);
        this.loading = false;
      }
    });
  }

  getEventColor(title: string): string {
    const theme = this.festivalThemes[title];
    return theme?.accentStrong || '#0ea5e9';
  }

  getGrowthColor(value: number): string {
    if (value > 15) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  }

  getRecommendation(growth: number): string {
    if (growth > 20) return 'Increase inventory significantly';
    if (growth > 10) return 'Increase stock moderately';
    if (growth < 0) return 'Monitor demand carefully';
    return 'Maintain current inventory';
  }

  getFestivalRecommendation(growth: number): string {
    if (growth > 25) return 'High demand likely. Prepare extra stock, staff, and fast-moving combos.';
    if (growth > 10) return 'Moderate growth expected. Increase inventory for top dishes and keep staff ready.';
    if (growth >= 0) return 'Stable demand expected. Maintain balanced stock and monitor live orders.';
    return 'Demand may soften. Avoid overstocking and track underperforming dishes closely.';
  }

  getCrowdTag(growth: number): string {
    if (growth > 25) return 'High Rush Expected';
    if (growth > 10) return 'Busy Festival Window';
    if (growth >= 0) return 'Balanced Traffic';
    return 'Soft Demand Risk';
  }

  getOperationalAdvice(items: any[], growth: number): string[] {
    const sorted = [...items].sort((a, b) => (b.predictedSales || 0) - (a.predictedSales || 0));
    const topTwo = sorted.slice(0, 2).map((x) => x.dishName);
    const lowPerformer = [...items].sort((a, b) => (a.growthPercent || 0) - (b.growthPercent || 0))[0]?.dishName;

    const advice: string[] = [];

    if (topTwo.length) {
      advice.push(`Prioritize prep for ${topTwo.join(' and ')}.`);
    }

    if (growth > 15) {
      advice.push('Increase staffing for peak ordering hours.');
    } else {
      advice.push('Keep inventory balanced and monitor live ordering trends.');
    }

    if (lowPerformer) {
      advice.push(`Watch ${lowPerformer} carefully to avoid overproduction.`);
    }

    return advice;
  }

  getProgressWidth(value: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.max(6, (value / total) * 100));
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  trackByDish(index: number, item: any): string {
    return item.dishName;
  }
}