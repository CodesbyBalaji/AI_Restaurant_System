import {
  Component
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FullCalendarModule
} from '@fullcalendar/angular';

import dayGridPlugin from '@fullcalendar/daygrid';

import interactionPlugin from '@fullcalendar/interaction';

import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-calendar',

  standalone: true,

  imports: [
    CommonModule,
    FullCalendarModule
  ],

  templateUrl: './calendar.html',

  styleUrl: './calendar.css'
})

export class CalendarComponent {

  constructor(
    private http: HttpClient
  ) {}

  loading = false;

  selectedFestival: any = null;

  apiUrl =
    'http://localhost:5000/api/festival/analytics';

  calendarOptions: any = {

    initialView: 'dayGridMonth',

    plugins: [
      dayGridPlugin,
      interactionPlugin
    ],

    height: 'auto',

    eventClick:
      this.handleEventClick.bind(this),

    events: [

      {
        title: '🎆 Diwali',
        date: '2026-11-12'
      },

      {
        title: '🪔 Pongal',
        date: '2026-01-14'
      },

      {
        title: '🇮🇳 Republic Day',
        date: '2026-01-26'
      },

      {
        title: '🌙 Ramzan',
        date: '2026-03-21'
      },

      {
        title: '🌸 Tamil New Year',
        date: '2026-04-14'
      },

      {
        title: '🐐 Bakrid',
        date: '2026-05-28'
      },

      {
        title: '🇮🇳 Independence Day',
        date: '2026-08-15'
      },

      {
        title: '🐘 Ganesh Chaturthi',
        date: '2026-09-05'
      },

      {
        title: '🪔 Ayudha Pooja',
        date: '2026-10-20'
      },

      {
        title: '🎄 Christmas',
        date: '2026-12-25'
      }
    ]
  };

  handleEventClick(info: any) {

    this.loading = true;

    this.selectedFestival = null;

    const festivalDate =
      info.event.startStr || '';

    const festivalName =
      info.event.title || 'Festival';

    this.http.get<any[]>(

      `${this.apiUrl}/${festivalDate}`

    ).subscribe({

      next: (data) => {

        this.selectedFestival = {

          title: festivalName,

          date: festivalDate,

          items: data
        };

        this.loading = false;
      },

      error: (err) => {

        console.error(
          'Festival Analytics Error:',
          err
        );

        this.loading = false;
      }
    });
  }

  getGrowthColor(
    value: number
  ): string {

    if (value > 15) {

      return 'text-green-600';
    }

    if (value < 0) {

      return 'text-red-500';
    }

    return 'text-yellow-500';
  }

  getRecommendation(
    growth: number
  ): string {

    if (growth > 20) {

      return 'Increase inventory significantly';
    }

    if (growth > 10) {

      return 'Increase stock moderately';
    }

    if (growth < 0) {

      return 'Monitor demand carefully';
    }

    return 'Maintain current inventory';
  }
}